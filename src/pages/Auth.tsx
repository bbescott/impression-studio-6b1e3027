import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cleanupAuthState } from "@/utils/auth-cleanup";
import { Link } from "react-router-dom";

export default function Auth() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // SEO
  useEffect(() => {
    const title = mode === "signin" ? "Sign in | Impression Studio" : "Create account | Impression Studio";
    document.title = title;

    const desc = "Sign in or create an account for Impression Studio via email or LinkedIn.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}/auth`);
  }, [mode]);

  // Auth listener and session check
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setTimeout(() => {
          window.location.href = "/profile";
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        window.location.href = "/profile";
      } else {
        setInitializing(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Detect auth token changes from other tabs/windows (e.g., OAuth popup/new tab)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.startsWith('supabase.auth.') || e.key.includes('sb-')) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            window.location.href = "/profile";
          }
        }).catch(() => {});
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: "global" }); } catch {}

      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          window.location.href = "/profile";
        }
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We sent you a confirmation link to complete your signup.",
        });
      }
    } catch (err: any) {
      toast({ title: "Authentication error", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedIn = async () => {
    try {
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: "global" }); } catch {}
      const redirectTo = `${window.location.origin}/profile`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "linkedin_oidc",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (data?.url) {
        try {
          if (window.top && window.top !== window) {
            window.top.location.assign(data.url);
          } else {
            window.location.assign(data.url);
          }
        } catch {
          const opened = window.open(data.url, "_blank", "noopener,noreferrer");
          if (!opened) {
            window.location.href = data.url;
          }
        }
      }
    } catch (err: any) {
      toast({ title: "LinkedIn sign-in failed", description: err?.message || "Please try again.", variant: "destructive" });
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold">{mode === "signin" ? "Sign in" : "Create your account"}</h1>
            <p className="text-muted-foreground mt-2">Access Impression Studio with email or LinkedIn.</p>
          </div>

          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant={mode === "signin" ? "default" : "secondary"}
                onClick={() => setMode("signin")}
                disabled={loading}
              >
                Email sign in
              </Button>
              <Button
                type="button"
                variant={mode === "signup" ? "default" : "secondary"}
                onClick={() => setMode("signup")}
                disabled={loading}
              >
                Create account
              </Button>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading || initializing}>
                {mode === "signin" ? (loading ? "Signing in..." : "Sign in") : (loading ? "Creating account..." : "Create account")}
              </Button>
            </form>

            <div className="relative text-center">
              <span className="px-2 text-xs text-muted-foreground">or</span>
            </div>

            <Button type="button" variant="secondary" className="w-full" onClick={handleLinkedIn} disabled={initializing}>
              Continue with LinkedIn
            </Button>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link to="/" className="underline underline-offset-4 hover:text-foreground">Back to home</Link>
            <span className="mx-2">·</span>
            <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground">Privacy Policy</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
