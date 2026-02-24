import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { syncSingleUser } from "@/lib/sync-user";
import { redirect } from "next/navigation";
import { CheckCircle2, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScaleIn, FadeIn } from "@/components/motion";
import Link from "next/link";

export default async function VerificationSuccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Session may not have propagated yet (edge case: link opened in a different
  // browser than the one with the original GitHub session).  The OTP was
  // already verified and the profile updated by /auth/confirm, so show a
  // friendly success screen instead of looping back to the landing page.
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <main className="max-w-md w-full text-center space-y-6">
          <ScaleIn className="flex justify-center text-green-500">
            <CheckCircle2 className="w-16 h-16" />
          </ScaleIn>
          <FadeIn delay={0.15}>
            <h1 className="text-3xl font-bold tracking-tight">Email Verified!</h1>
            <p className="text-muted-foreground mt-2">
              Your @uwaterloo.ca address has been confirmed. Sign in to access the
              leaderboard.
            </p>
          </FadeIn>
          <FadeIn delay={0.25}>
            <Button asChild className="w-full gap-2 py-6 text-lg">
              <Link href="/">Sign In</Link>
            </Button>
          </FadeIn>
        </main>
      </div>
    );
  }

  const email = user.email;
  const isWaterlooEmail = email?.endsWith("@uwaterloo.ca");

  const githubUsername = (user.user_metadata?.user_name || user.user_metadata?.preferred_username) as string | undefined;

  if (isWaterlooEmail) {
    try {
      await prisma.profile.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          username: githubUsername || (email || "").split("@")[0],
          githubUsername,
          fullName: user.user_metadata?.full_name as string | undefined,
          avatarUrl: user.user_metadata?.avatar_url as string | undefined,
          email: email,
          isVerified: true,
        },
        update: {
          isVerified: true,
          email: email,
          githubUsername,
        },
      });

      // Sync GitHub data so user appears on leaderboard immediately
      if (githubUsername) {
        try {
          await syncSingleUser(user.id, githubUsername);
        } catch (err) {
          console.error('[verify/success] Sync failed:', err);
        }
      }
    } catch (err) {
      console.error('[verify/success] Profile upsert failed:', err);
      // Continue rendering success page — the /auth/confirm route already verified the email
    }
  } else {
    // If they somehow got here without a Waterloo email, send them back to verify
    return redirect("/verify");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <main className="max-w-md w-full">
        <div className="text-center mb-8 space-y-2">
          <ScaleIn className="flex justify-center mb-4 text-green-500">
            <CheckCircle2 className="w-16 h-16" />
          </ScaleIn>
          <FadeIn delay={0.15}>
            <h1 className="text-3xl font-bold tracking-tight">
              Verification Successful
            </h1>
            <p className="text-muted-foreground mt-2">
              You're now a verified member of the Waterloo GitRank community.
            </p>
          </FadeIn>
        </div>

        <FadeIn delay={0.25}>
          <Card className="border-border shadow-xl overflow-hidden">
          <div className="h-2 bg-green-500" />
          <CardHeader>
            <CardTitle className="text-xl">Welcome!</CardTitle>
            <CardDescription>
              Your stats will now be actively synced and displayed on the
              leaderboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 border border-border rounded-lg flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Rankings are live</p>
                <p className="text-xs text-muted-foreground">
                  See where you stand on the leaderboard.
                </p>
              </div>
            </div>

            <Button asChild className="w-full gap-2 py-6 text-lg">
              <Link href="/leaderboard">
                Go to Leaderboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        </FadeIn>

        <p className="text-center mt-8 text-xs text-muted-foreground px-4">
          Logged in as{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </main>
    </div>
  );
}
