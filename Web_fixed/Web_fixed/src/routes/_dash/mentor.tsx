import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, X, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApplicantsFn, updateApplicantStatusFn, getInternProgressFn } from "@/api/users";
import { InternTrackerTable } from "@/components/InternTrackerTable";

export const Route = createFileRoute("/_dash/mentor")({
  head: () => ({ meta: [{ title: "Mentor Dashboard — InternHub" }] }),
  component: MentorDashboard,
});

function MentorDashboard() {
  const queryClient = useQueryClient();

  const { data: applicants = [], isLoading: loadingApplicants } = useQuery({
    queryKey: ["applicants"],
    queryFn: () => getApplicantsFn(),
  });

  const { data: internProgress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ["internProgress"],
    queryFn: () => getInternProgressFn(),
  });

  const decideMutation = useMutation({
    mutationFn: (vars: { id: string; accept: boolean }) =>
      updateApplicantStatusFn({ data: vars }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["internProgress"] });
      toast[vars.accept ? "success" : "info"](
        vars.accept ? "Applicant accepted" : "Applicant rejected"
      );
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update applicant status");
    },
  });

  const decide = (id: string, accept: boolean) =>
    decideMutation.mutate({ id, accept });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Mentor <span className="text-gradient-primary">Dashboard</span>
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Review applicants and track your team's progress.
        </p>
      </div>

      <Tabs defaultValue="applicants">
        <TabsList className="rounded-full bg-secondary/70 p-1">
          <TabsTrigger
            value="applicants"
            className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            Applicants
            {applicants.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {applicants.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            My Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applicants" className="mt-5">
          {loadingApplicants ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading applicants…
            </div>
          ) : applicants.length === 0 ? (
            <Card className="border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground backdrop-blur">
              All caught up — no pending applicants.
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {applicants.map((a) => (
                <Card
                  key={a.id}
                  className="hover-lift border-border/60 bg-[image:var(--gradient-card)] p-5 shadow-[var(--shadow-soft)] backdrop-blur"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                      <AvatarFallback className="bg-[image:var(--gradient-primary)] font-semibold text-primary-foreground">
                        {a.name
                          .split(" ")
                          .map((p: string) => p[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{a.name}</h3>
                          <p className="text-xs text-muted-foreground">{a.email}</p>
                        </div>
                        <div className="flex items-center gap-1 rounded-full bg-[image:var(--gradient-primary)] px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                          <Sparkles className="h-3 w-3" />
                          AI 85
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => decide(a.id, true)}
                          disabled={decideMutation.isPending}
                          className="btn-gradient flex-1 rounded-full"
                        >
                          <Check className="h-4 w-4" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => decide(a.id, false)}
                          disabled={decideMutation.isPending}
                          className="flex-1 rounded-full"
                        >
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

        <TabsContent value="team" className="mt-5">
          {loadingProgress ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading team…
            </div>
          ) : (
            <Card className="overflow-hidden border-border/60 bg-card/80 shadow-[var(--shadow-soft)] backdrop-blur">
              <InternTrackerTable
                interns={internProgress.filter(
                  (i) => i.status === "Accepted" || i.status === "Active"
                )}
              />
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
