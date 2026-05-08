import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useStore, type Role } from "@/lib/store";
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
  const [role, setRole] = useState<Role>("intern");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Enter email and password");
    const name = email.split("@")[0].replace(/[._-]/g, " ");
    setCurrentUser({ id: crypto.randomUUID(), email, name: name.replace(/\b\w/g, (c) => c.toUpperCase()), role });
    toast.success(`Welcome back, ${role}!`);
    navigate({ to: role === "admin" ? "/admin" : role === "mentor" ? "/mentor" : "/intern" });
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
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Sign in as (demo)</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["intern", "mentor", "admin"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-md border px-3 py-2 text-sm capitalize transition ${
                      role === r ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full">Sign in</Button>
            <p className="text-center text-sm text-muted-foreground">
              New here? <Link to="/signup" className="font-medium text-primary hover:underline">Create an account</Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
