/**
 * Remove a user completely from the database so they can sign up again.
 * Requires: SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL in .env.local
 *
 * Usage:
 *   npx tsx scripts/remove-user.ts <user-id | email | github_username>
 *
 * Examples:
 *   npx tsx scripts/remove-user.ts 550e8400-e29b-41d4-a716-446655440000
 *   npx tsx scripts/remove-user.ts someone@uwaterloo.ca
 *   npx tsx scripts/remove-user.ts octocat
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { prisma } from '../src/lib/prisma'

async function main() {
  const input = process.argv[2]?.trim()
  if (!input) {
    console.error('Usage: npx tsx scripts/remove-user.ts <user-id | email | github_username>')
    process.exit(1)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  // Resolve to user id and github_username
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)
  let userId: string
  let githubUsername: string | null = null

  if (isUuid) {
    const profile = await prisma.profile.findUnique({
      where: { id: input },
      select: { id: true, githubUsername: true },
    })
    if (!profile) {
      console.error('No profile found for user id:', input)
      process.exit(1)
    }
    userId = profile.id
    githubUsername = profile.githubUsername
  } else if (input.includes('@')) {
    const profile = await prisma.profile.findFirst({
      where: { email: input },
      select: { id: true, githubUsername: true },
    })
    if (!profile) {
      console.error('No profile found for email:', input)
      process.exit(1)
    }
    userId = profile.id
    githubUsername = profile.githubUsername
  } else {
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { githubUsername: input },
          { username: input },
        ],
      },
      select: { id: true, githubUsername: true },
    })
    if (!profile) {
      console.error('No profile found for GitHub username:', input)
      process.exit(1)
    }
    userId = profile.id
    githubUsername = profile.githubUsername ?? input
  }

  console.log('Removing user:', userId, githubUsername ? `(@${githubUsername})` : '')

  // 1. Delete from auth.users (cascades to profiles + github_metrics)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: authError } = await supabase.auth.admin.deleteUser(userId)
  if (authError) {
    console.error('Failed to delete auth user:', authError.message)
    process.exit(1)
  }
  console.log('Deleted from auth.users (profiles + github_metrics cascaded).')

  // 2. Remove from leaderboard_viewers if keyed by github_username
  if (githubUsername) {
    await prisma.leaderboardViewer.deleteMany({
      where: { githubUsername },
    })
    console.log('Deleted from leaderboard_viewers.')
  }

  // 3. Refresh materialized view
  await prisma.$executeRaw`SELECT refresh_leaderboard()`
  console.log('Refreshed leaderboard view.')

  console.log('Done. They can sign up again from scratch.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
