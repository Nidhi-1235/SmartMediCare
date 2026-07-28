import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HeartPulse, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSpeech, useSpokenIntro } from "@/lib/speech";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SmartMediCare" },
      { name: "description", content: "Sign in to SmartMediCare to manage your medicines with voice guidance." },
      { property: "og:title", content: "Sign in — SmartMediCare" },
      { property: "og:description", content: "Sign in to SmartMediCare to manage your medicines with voice guidance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { speak } = useSpeech();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useSpokenIntro("Welcome to Smart Medi Care. Sign in with your email, or continue with Google.");

  const fail = (text: string) => {
    setMessage(text);
    speak(text);
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
        });
        if (error) throw error;
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          speak("Account created. Opening your home screen.");
          navigate({ to: "/home" });
        } else {
          const text = "Account created. Please check your email to confirm, then sign in.";
          setMessage(text);
          speak(text);
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        speak("Signed in. Opening your home screen.");
        navigate({ to: "/home" });
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    setMessage(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setBusy(false);
      fail("Google sign-in did not work. Please try email instead.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home" });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-6 py-10">
      <div className="text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
          <HeartPulse aria-hidden="true" className="size-10" />
        </div>
        <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-foreground">SmartMediCare</h1>
        <p className="mt-2 text-lg text-muted-foreground">Your talking medicine helper.</p>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Sign in or create account">
        {(["signin", "signup"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={mode === value}
            onClick={() => {
              setMode(value);
              speak(value === "signin" ? "Sign in selected." : "Create account selected.");
            }}
            className={`tap-target flex-1 rounded-2xl border-2 text-base font-bold transition-colors ${
              mode === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground"
            }`}
          >
            {value === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "signup" ? (
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-base font-semibold">
              Your name
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              className="tap-target text-lg"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-semibold">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="tap-target text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-base font-semibold">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="tap-target text-lg"
          />
        </div>

        {message ? (
          <p role="alert" className="rounded-xl bg-secondary px-4 py-3 text-base font-medium text-foreground">
            {message}
          </p>
        ) : null}

        <Button type="submit" disabled={busy} className="tap-target w-full text-lg font-bold">
          {busy ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : null}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <div className="space-y-4">
        <p className="text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">or</p>
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          disabled={busy}
          className="tap-target w-full border-2 text-lg font-bold"
        >
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
