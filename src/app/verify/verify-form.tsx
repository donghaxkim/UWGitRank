'use client'

import { useActionState } from 'react'
import { verifyStudentEmail } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type FormState = {
    error?: string;
    success?: boolean;
    message?: string;
};

const initialState: FormState = {};

export function VerifyForm() {
    const [state, formAction, isPending] = useActionState(verifyStudentEmail, initialState)

    if (state.success) {
        return (
            <div className="flex flex-col items-center gap-4 p-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-500">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Check your inbox</h3>
                    <p className="text-sm text-muted-foreground">
                        {state.message}
                    </p>
                </div>
                <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
                    Didn't get it? Try again.
                </Button>
            </div>
        )
    }

    return (
        <form action={formAction} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Waterloo Email</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="yourname@uwaterloo.ca"
                        className="pl-10"
                        required
                        disabled={isPending}
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    Only @uwaterloo.ca email addresses are allowed for verification.
                </p>
            </div>

            {state.error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2 text-sm text-destructive animate-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {state.error}
                </div>
            )}

            <Button type="submit" className="w-full gap-2" disabled={isPending}>
                {isPending ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending Link...
                    </>
                ) : (
                    'Send Verification Link'
                )}
            </Button>
        </form>
    )
}
