import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";
import { signupFn } from "@/api/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — InternHub" },
      { name: "description", content: "Apply to the internship program with InternHub." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { setCurrentUser } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pdpa, setPdpa] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return toast.error("Please fill in all fields");
    if (!pdpa) return toast.error("You must accept the PDPA consent");
    setLoading(true);
    try {
      const user = await signupFn({ data: { name, email, password } });
      setCurrentUser({ id: user.id, name: user.name, email: user.email, role: user.role as any, status: user.status as any });
      toast.success("Application submitted! Welcome to InternHub.");
      navigate({ to: "/intern", replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-lg p-8 shadow-[var(--shadow-elevated)]">
          <Link to="/login" className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <GraduationCap className="h-4 w-4 text-primary" /> InternHub
          </Link>
          <h2 className="text-2xl font-semibold">Apply for an internship</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create your account to get started.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Full name</Label>
              <Input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@uni.edu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
              <Checkbox id="pdpa" checked={pdpa} onCheckedChange={(v) => setPdpa(Boolean(v))} className="mt-0.5" />
              <Label htmlFor="pdpa" className="text-sm font-normal leading-snug">
                I consent to the collection and processing of my personal data in accordance with the
                <span className="font-medium text-foreground"> PDPA (Personal Data Protection Act)</span> for the
                purpose of evaluating my internship application. <span className="text-destructive">*</span>
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already registered? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </form>
        </Card>
      </div>
      <div className="hidden flex-col justify-between bg-[image:var(--gradient-primary)] p-12 text-primary-foreground lg:flex">
        <div className="ml-auto text-right text-xs opacity-70">Step 1 of 1</div>
        <div>
          <h1 className="text-4xl font-semibold leading-tight">Start your<br/>internship journey.</h1>
          <p className="mt-4 max-w-md text-sm opacity-90">Submit your application in minutes. Track progress, meet your mentor, and ship real projects.</p>
        </div>
        <ul className="space-y-2 text-sm opacity-90">
          <li>✓ Mentor matching</li>
          <li>✓ AI-assisted screening</li>
          <li>✓ Real project portfolio</li>
        </ul>
      </div>
    </div>
  );
}

