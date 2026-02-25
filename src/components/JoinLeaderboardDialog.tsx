'use client'

import { useState } from 'react'
import { Dialog } from 'radix-ui'
import { X, Github, UserPlus, Loader2, AlertCircle, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PROGRAM_OPTIONS } from '@/lib/leaderboard-shared'

type Step = 'choose' | 'login' | 'signup'

const inputClassName =
  'h-9 w-full rounded-md border border-zinc-300 bg-white px-3 py-1 text-base text-zinc-900 shadow-xs outline-none focus:border-[#EAB308] focus:ring-2 focus:ring-[#EAB308]/20'

const selectClassName =
  'h-9 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-base text-zinc-900 shadow-xs outline-none focus:border-[#EAB308] focus:ring-2 focus:ring-[#EAB308]/20 appearance-none cursor-pointer'

interface JoinLeaderboardDialogProps {
  signInToView: () => void
  authErrorMessage?: string | null
  children: React.ReactNode
}

export function JoinLeaderboardDialog({
  signInToView,
  authErrorMessage,
  children,
}: JoinLeaderboardDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('choose')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    program: '',
    waterlooEmail: '',
    linkedinUrl: '',
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setStep('choose')
      setError(null)
      setForm({ firstName: '', lastName: '', program: '', waterlooEmail: '', linkedinUrl: '' })
    }
  }

  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/auth/signup-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          program: form.program || undefined,
          waterlooEmail: form.waterlooEmail.trim(),
          linkedinUrl: form.linkedinUrl.trim() || undefined,
        }),
      })
      const text = await res.text()
      let data: { error?: string; redirectUrl?: string } = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        // Server returned non-JSON (e.g. HTML error page)
        setError(res.ok ? 'Invalid response from server.' : `Request failed (${res.status}). Check the console or Supabase env vars.`)
        return
      }
      if (!res.ok) {
        setError(data.error || `Something went wrong (${res.status}). Please try again.`)
        return
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }
      setError(data.error || 'Something went wrong. Please try again.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] sm:w-full max-w-md translate-x-[-50%] translate-y-[-50%]',
            'bg-[#f2f2f2] text-zinc-900 rounded-2xl shadow-2xl border border-zinc-200',
            'max-h-[85vh] overflow-y-auto p-4 sm:p-6',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'duration-200'
          )}
        >
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center shrink-0">
                <Github className="w-5 h-5 text-[#EAB308]" />
              </div>
              <div>
                <Dialog.Title className="text-xl font-bold tracking-tight">
                  Join Leaderboard
                </Dialog.Title>
                <Dialog.Description className="text-sm text-zinc-500">
                  {step === 'choose'
                    ? 'Log in to view the leaderboard or sign up to join.'
                    : 'Enter your details and Waterloo email, then connect with GitHub.'}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="cursor-pointer p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {step === 'choose' && (
            <div className="flex flex-col items-center gap-4">
              {authErrorMessage && (
                <div className="w-full p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-sm text-red-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {authErrorMessage}
                </div>
              )}
              <Button
                type="button"
                className="cursor-pointer w-full h-11 bg-[#EAB308] text-black hover:bg-[#D9A307] gap-2 font-semibold"
                onClick={() => setStep('signup')}
              >
                <UserPlus className="w-4 h-4" />
                Sign up
              </Button>
              <form action={signInToView}>
                <button
                  type="submit"
                  className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  Already have an account?{" "}
                  <span className="underline underline-offset-4 font-medium">
                    Log in
                  </span>
                </button>
              </form>
            </div>
          )}

          {step === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-zinc-700">
                    First name
                  </Label>
                  <Input
                    id="firstName"
                    className={inputClassName}
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                    required
                    placeholder="Jane"
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-zinc-700">
                    Last name
                  </Label>
                  <Input
                    id="lastName"
                    className={inputClassName}
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                    required
                    placeholder="Doe"
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="program" className="text-zinc-700">
                  Program
                </Label>
                <select
                  id="program"
                  className={cn(selectClassName, 'pr-8')}
                  value={form.program}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, program: e.target.value }))
                  }
                  required
                  disabled={submitting}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23717171' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                  }}
                >
                  <option value="">Select program</option>
                  {PROGRAM_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="waterlooEmail" className="text-zinc-700">
                  Waterloo Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                  <Input
                    id="waterlooEmail"
                    type="email"
                    className={cn(inputClassName, 'pl-9')}
                    value={form.waterlooEmail}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, waterlooEmail: e.target.value }))
                    }
                    required
                    placeholder="yourname@uwaterloo.ca"
                    disabled={submitting}
                  />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Must be a valid @uwaterloo.ca address.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="linkedinUrl" className="text-zinc-700">
                  LinkedIn profile (optional)
                </Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  className={inputClassName}
                  value={form.linkedinUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, linkedinUrl: e.target.value }))
                  }
                  placeholder="https://linkedin.com/in/username"
                  disabled={submitting}
                />
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-sm text-red-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="cursor-pointer text-zinc-600"
                  onClick={() => {
                    setStep('choose')
                    setError(null)
                  }}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="cursor-pointer flex-1 bg-[#EAB308] text-black hover:bg-[#D9A307] gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Github className="w-4 h-4" />
                      Continue with GitHub
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
