import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { loginFn } from "@/api/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — InternHub" },
      { name: "description", content: "Sign in to your InternHub account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { setCurrentUser } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Enter email and password");
    setLoading(true);
    try {
      const user = await loginFn({ data: { email, password } });
      setCurrentUser({ id: user.id, name: user.name, email: user.email, role: user.role as any, status: user.status as any });
      toast.success(`Welcome back, ${user.name}!`);
      const dest = user.role === "admin" ? "/admin" : user.role === "mentor" ? "/mentor" : "/intern";
      navigate({ to: dest, replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-[image:var(--gradient-primary)] p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-lg font-semibold">InternHub</span>
        </div>
        <div>
          <h1 className="text-4xl font-semibold leading-tight">Grow careers,<br/>guide the next generation.</h1>
          <p className="mt-4 max-w-md text-sm opacity-90">A complete platform for managing internship applications, mentorship and project tracking — built for teams that care about people.</p>
        </div>
        <p className="text-xs opacity-70">© {new Date().getFullYear()} InternHub</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 shadow-[var(--shadow-elevated)]">
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back. Continue to your dashboard.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              New here? <Link to="/signup" className="font-medium text-primary hover:underline">Create an account</Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
