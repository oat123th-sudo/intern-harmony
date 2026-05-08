import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_dash/mentor")({
  head: () => ({ meta: [{ title: "Mentor Dashboard — InternHub" }] }),
  component: MentorDashboard,
});

type Applicant = { id: string; name: string; score: number; tags: string[]; bio: string };
type Member = { id: string; name: string; project: string; progress: number };

const APPLICANTS: Applicant[] = [
  { id: "a1", name: "Hana Sato", score: 92, tags: ["React", "TypeScript", "UI/UX"], bio: "CS senior with 2 hackathon wins." },
  { id: "a2", name: "Marcus Lee", score: 87, tags: ["Node.js", "PostgreSQL", "AWS"], bio: "Backend enthusiast, OSS contributor." },
  { id: "a3", name: "Aisha Khan", score: 78, tags: ["Python", "ML", "Pandas"], bio: "Data science intern at university lab." },
  { id: "a4", name: "Lukas Berg", score: 71, tags: ["Figma", "Branding"], bio: "Product design student." },
];

const TEAM: Member[] = [
  { id: "m1", name: "Alex Kim", project: "Customer portal redesign", progress: 72 },
  { id: "m2", name: "Diego Soto", project: "Analytics dashboard MVP", progress: 45 },
  { id: "m3", name: "Sara Lopez", project: "Mobile onboarding flow", progress: 88 },
];

function MentorDashboard() {
  const [applicants, setApplicants] = useState(APPLICANTS);

  const decide = (id: string, accept: boolean) => {
    setApplicants((a) => a.filter((x) => x.id !== id));
    toast[accept ? "success" : "info"](accept ? "Applicant accepted" : "Applicant rejected");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mentor Dashboard</h1>
        <p className="text-sm text-muted-foreground">Review applicants and track your team's progress.</p>
      </div>

      <Tabs defaultValue="applicants">
        <TabsList>
          <TabsTrigger value="applicants">Applicants</TabsTrigger>
          <TabsTrigger value="team">My Team</TabsTrigger>
        </TabsList>

        <TabsContent value="applicants" className="mt-4">
          {applicants.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">All caught up — no pending applicants.</Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {applicants.map((a) => (
                <Card key={a.id} className="p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {a.name.split(" ").map((p) => p[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{a.name}</h3>
                          <p className="text-xs text-muted-foreground">{a.bio}</p>
                        </div>
                        <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          <Sparkles className="h-3 w-3" />
                          AI {a.score}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {a.tags.map((t) => (
                          <Badge key={t} variant="secondary" className="font-normal">{t}</Badge>
                        ))}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" onClick={() => decide(a.id, true)} className="flex-1">
                          <Check className="h-4 w-4" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => decide(a.id, false)} className="flex-1">
                          <X className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <div className="space-y-3">
            {TEAM.map((m) => (
              <Card key={m.id} className="p-5">
                <div className="flex items-center gap-4">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {m.name.split(" ").map((p) => p[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.project}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{m.progress}%</span>
                    </div>
                    <Progress value={m.progress} className="mt-2 h-2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
