import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Github, Mail, MoreHorizontal, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";
import { VerifyForm } from "./verify-form";
import { signOut } from "@/app/auth/actions";

export default async function VerifyStudentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/");
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { isVerified: true },
    });

    if (profile?.isVerified) {
      return redirect("/leaderboard");
    }
  } catch (err) {
    console.error('[verify] Profile lookup failed:', err);
    // Continue rendering the verify form — don't crash the page
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f2f2f2] text-zinc-900 p-4">
      <main className="max-w-md w-full">
        <div className="text-center mb-10 space-y-6">
          <StaggerContainer stagger={0.12} className="flex items-center justify-center gap-6 text-zinc-400">
            <StaggerItem>
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center shadow-md">
                <Github className="w-9 h-9 text-[#EAB308]" />
              </div>
            </StaggerItem>
            <StaggerItem>
              <MoreHorizontal className="w-8 h-8 opacity-30" />
            </StaggerItem>
            <StaggerItem>
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-zinc-200 shadow-sm">
                <Mail className="w-8 h-8 text-black" />
              </div>
            </StaggerItem>
          </StaggerContainer>

          <FadeIn delay={0.2}>
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight">
                Verify Student
              </h1>
              <p className="text-zinc-500 text-lg">
                Link your GitHub to your Waterloo email.
              </p>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.3}>
          <Card className="border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Step 2: University Email</CardTitle>
              <CardDescription>
                We need to confirm you are a Waterloo student. Enter your email below to receive a verification code.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VerifyForm />
            </CardContent>
          </Card>
        </FadeIn>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Signed in as{" "}
              <strong>{user.user_metadata?.full_name || user.email}</strong>
            </span>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
            >
              <LogOut className="w-4 h-4" />
              Use different account
            </Button>
          </form>
        </div>
      </main>

      <footer className="mt-auto py-8 text-[11px] font-mono text-zinc-400 uppercase tracking-widest font-medium text-center">
        © UW GitRank 2026
      </footer>
    </div>
  );
}
