'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { verifyStudentEmail, verifyOtpCode } from '@/app/auth/actions'
import { OtpInput } from '@/components/ui/otp-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'

type Step = 'email_entry' | 'otp_entry'

export function VerifyForm() {
    const router = useRouter()
    const [step, setStep] = useState<Step>('email_entry')
    const [email, setEmail] = useState('')
    const [otpValue, setOtpValue] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, startTransition] = useTransition()
    const [resendCooldown, setResendCooldown] = useState(0)
    const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const hasAutoSubmitted = useRef(false)

    function startResendCooldown() {
        setResendCooldown(60)
        if (cooldownRef.current) clearInterval(cooldownRef.current)
        cooldownRef.current = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) {
                    if (cooldownRef.current) clearInterval(cooldownRef.current)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }

    useEffect(() => {
        return () => {
            if (cooldownRef.current) clearInterval(cooldownRef.current)
        }
    }, [])

    // Auto-submit when all 6 digits are entered
    useEffect(() => {
        if (otpValue.length === 6 && step === 'otp_entry' && !isSubmitting && !hasAutoSubmitted.current) {
            hasAutoSubmitted.current = true
            handleOtpSubmit()
        }
        if (otpValue.length < 6) {
            hasAutoSubmitted.current = false
        }
    }, [otpValue, step, isSubmitting])

    function handleEmailSubmit(formData: FormData) {
        setError(null)
        startTransition(async () => {
            const result = await verifyStudentEmail(null, formData)
            if (result.error) {
                setError(result.error)
            } else if (result.success && result.email) {
                setEmail(result.email)
                setStep('otp_entry')
                startResendCooldown()
            }
        })
    }

    function handleOtpSubmit() {
        if (otpValue.length !== 6) return
        setError(null)
        startTransition(async () => {
            const result = await verifyOtpCode(email, otpValue)

            if (result.error) {
                setError(
                    result.error === 'Token has expired or is invalid'
                        ? 'Invalid or expired code. Please try again.'
                        : result.error
                )
                setOtpValue('')
                return
            }

            router.push('/dashboard')
        })
    }

    function handleResend() {
        setError(null)
        const formData = new FormData()
        formData.set('email', email)
        startTransition(async () => {
            const result = await verifyStudentEmail(null, formData)
            if (result.error) {
                setError(result.error)
            } else {
                setOtpValue('')
                startResendCooldown()
            }
        })
    }

    if (step === 'otp_entry') {
        return (
            <div className="space-y-6">
                <div className="text-center space-y-1">
                    <p className="text-sm text-muted-foreground">
                        Enter the 6-digit code sent to
                    </p>
                    <p className="font-medium text-sm">{email}</p>
                </div>

                <OtpInput
                    value={otpValue}
                    onChange={setOtpValue}
                    disabled={isSubmitting}
                    error={!!error}
                    autoFocus
                />

                {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2 text-sm text-destructive animate-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                <Button
                    onClick={handleOtpSubmit}
                    className="w-full gap-2"
                    disabled={isSubmitting || otpValue.length !== 6}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verifying...
                        </>
                    ) : (
                        'Verify Code'
                    )}
                </Button>

                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setStep('email_entry')
                            setOtpValue('')
                            setError(null)
                        }}
                        disabled={isSubmitting}
                        className="gap-1 text-muted-foreground"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Change email
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResend}
                        disabled={isSubmitting || resendCooldown > 0}
                        className="text-muted-foreground"
                    >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <form action={handleEmailSubmit} className="space-y-4">
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
                        disabled={isSubmitting}
                        defaultValue={email}
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    Only @uwaterloo.ca email addresses are allowed for verification.
                </p>
            </div>

            {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2 text-sm text-destructive animate-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending Code...
                    </>
                ) : (
                    'Send Verification Code'
                )}
            </Button>
        </form>
    )
}
