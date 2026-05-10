import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, UserCheck, TrendingUp, GraduationCap, Loader2, ClipboardList, Plus, Check, X, Sparkles } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsersFn, getInternProgressFn, getApplicantsFn, updateApplicantStatusFn } from "@/api/users";
import { assignTaskFn, assignTaskManyFn } from "@/api/tasks";
import { useStore } from "@/lib/store";
import { TEAMS, getTeam } from "@/lib/teams";
import { InternTrackerTable } from "@/components/InternTrackerTable";
import { toast } from "sonner";

export const Route = createFileRoute("/_dash/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — InternHub" }] }),
  component: AdminDashboard,
});

function StatCard({
  title, value, hint, icon: Icon, accent, ring,
}: {
  title: string; value: string | number; hint: string;
  icon: React.ElementType; accent: string; ring: string;
}) {
  return (
    <Card className="hover-lift group relative overflow-hidden border-border/60 bg-[image:var(--gradient-card)] p-6 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-50 blur-2xl transition-opacity group-hover:opacity-80 ${ring}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-3 text-4xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

type AssignTarget = { id: string; name: string } | null;

function AdminDashboard() {
  const { currentUser } = useStore();
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AssignTarget>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDetail, setTaskDetail] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsersFn(),
  });

  const { data: applicants = [], isLoading: loadingApplicants } = useQuery({
    queryKey: ["applicants", "all"],
    queryFn: () => getApplicantsFn(),
  });

  const { data: internProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: ["internProgress", selectedTeam],
    queryFn: () => getInternProgressFn({ data: selectedTeam === "all" ? "" : selectedTeam }),
  });

  const decideMutation = useMutation({
    mutationFn: (vars: { id: string; accept: boolean }) => updateApplicantStatusFn({ data: vars }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["applicants", "all"] });
      queryClient.invalidateQueries({ queryKey: ["internProgress"] });
      toast[vars.accept ? "success" : "info"](vars.accept ? "Applicant accepted" : "Applicant rejected");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update applicant status");
    },
  });

  const assignSingleMutation = useMutation({
    mutationFn: (vars: { internId: string; title: string; detail?: string; deadline: string }) =>
      assignTaskFn({
        data: {
          internId: vars.internId,
          title: vars.title,
          detail: vars.detail,
          deadline: vars.deadline,
          assignedById: currentUser?.id ?? "",
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internProgress"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      closeDialog();
      toast.success("Task assigned successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to assign task");
    },
  });

  const assignManyMutation = useMutation({
    mutationFn: (vars: { internIds: string[]; title: string; detail?: string; deadline: string }) =>
      assignTaskManyFn({
        data: {
          internIds: vars.internIds,
          title: vars.title,
          detail: vars.detail,
          deadline: vars.deadline,
          assignedById: currentUser?.id ?? "",
        },
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["internProgress"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      closeDialog();
      toast.success(`Task assigned to ${data.count} interns`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to assign bulk tasks");
    },
  });

  const decide = (id: string, accept: boolean) => decideMutation.mutate({ id, accept });

  const openDialog = (intern?: { id: string; name: string }) => {
    setAssignTarget(intern ?? null);
    setTaskTitle("");
    setTaskDetail("");
    setTaskDeadline("");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setAssignTarget(null);
    setTaskTitle("");
    setTaskDetail("");
    setTaskDeadline("");
  };

  const submitAssign = () => {
    if (!taskTitle.trim()) return toast.error("Task title is required");
    if (!taskDeadline) return toast.error("Deadline is required");
    if (!assignTarget) return toast.error("Please select an intern");

    if (assignTarget.id === "ALL_INTERNS") {
      // Get all accepted/active interns currently displayed or available
      const allInternIds = internProgress.map(i => i.id);
      if (allInternIds.length === 0) return toast.error("No active interns to assign tasks to.");
      assignManyMutation.mutate({
        internIds: allInternIds,
        title: taskTitle.trim(),
        detail: taskDetail.trim() || undefined,
        deadline: taskDeadline,
      });
    } else {
      assignSingleMutation.mutate({
        internId: assignTarget.id,
        title: taskTitle.trim(),
        detail: taskDetail.trim() || undefined,
        deadline: taskDeadline,
      });
    }
  };

  const isAssigning = assignSingleMutation.isPending || assignManyMutation.isPending;

  // Stats
  const interns = users.filter((u) => u.role === "intern");
  const total = interns.length;
  const accepted = interns.filter((u) => u.status === "Accepted").length;
  const active = interns.filter((u) => u.status === "Active").length;
  const mentors = users.filter((u) => u.role === "mentor").length;
  const completion = total ? Math.round(((accepted + active) / total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Admin <span className="text-gradient-primary">Dashboard</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Overview of program performance and user management.
          </p>
        </div>
        {/* Always-visible Assign Task button */}
        <Button
          className="btn-gradient h-10 rounded-full px-5 font-medium"
          onClick={() => openDialog()}
        >
          <Plus className="mr-1 h-4 w-4" /> Assign Task
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="rounded-full bg-secondary/70 p-1">
          <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Overview & Tracking
          </TabsTrigger>
          <TabsTrigger value="applicants" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
            All Applicants
            {applicants.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {applicants.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-8">
          {usersLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading stats…
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Total Applicants" value={total} hint="All-time intern signups" icon={Users} accent="bg-[image:var(--gradient-primary)] text-primary-foreground" ring="bg-primary/20" />
              <StatCard title="Accepted Interns" value={accepted + active} hint="Currently or previously accepted" icon={UserCheck} accent="bg-emerald-500 text-white" ring="bg-emerald-300/30" />
              <StatCard title="Completion Rate" value={`${completion}%`} hint="Accepted vs applied" icon={TrendingUp} accent="bg-amber-500 text-white" ring="bg-amber-300/30" />
              <StatCard title="Active Mentors" value={mentors} hint="Available for matching" icon={GraduationCap} accent="bg-sky-500 text-white" ring="bg-sky-300/30" />
            </div>
          )}

          <Card className="overflow-hidden border-border/60 bg-card/80 shadow-[var(--shadow-soft)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-gradient-to-r from-secondary/40 to-transparent p-5">
              <div>
                <h2 className="text-base font-semibold">Intern Tracking</h2>
                <p className="text-xs text-muted-foreground">Monitor tasks, assign work, and track deadlines for all interns.</p>
              </div>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="h-9 w-44 rounded-full bg-background text-sm">
                  <SelectValue placeholder="Filter by team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {TEAMS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {progressLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading intern data…
              </div>
            ) : (
              <InternTrackerTable
                interns={internProgress}
                onAssignTask={(intern) => openDialog(intern)}
                showTeam
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="applicants" className="mt-5">
          {loadingApplicants ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading applicants…
            </div>
          ) : applicants.length === 0 ? (
            <Card className="border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground backdrop-blur">
              All caught up — no pending applicants in the system.
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {applicants.map((a: any) => {
                const team = getTeam(a.team);
                return (
                  <Card key={a.id} className="hover-lift border-border/60 bg-[image:var(--gradient-card)] p-5 shadow-[var(--shadow-soft)] backdrop-blur">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                        <AvatarFallback className="bg-[image:var(--gradient-primary)] font-semibold text-primary-foreground">
                          {a.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold">{a.name}</h3>
                            <p className="text-xs text-muted-foreground">{a.email}</p>
                          </div>
                          {team && (
                            <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold border shadow-sm ${team.bg} ${team.color} ${team.border}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${team.dot}`} />
                              {team.label}
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button size="sm" onClick={() => decide(a.id, true)} disabled={decideMutation.isPending} className="btn-gradient flex-1 rounded-full">
                            <Check className="h-4 w-4" /> Accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => decide(a.id, false)} disabled={decideMutation.isPending} className="flex-1 rounded-full">
                            <X className="h-4 w-4" /> Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Assign Task Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {assignTarget && assignTarget.id !== "ALL_INTERNS" 
                ? `Assign Task to ${assignTarget.name}` 
                : "Assign Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!assignTarget ? (
              <div className="space-y-1.5">
                <Label>Select Intern <span className="text-destructive">*</span></Label>
                {internProgress.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/60 py-4 text-center text-sm text-muted-foreground">
                    No active interns available.
                  </p>
                ) : (
                  <Select
                    onValueChange={(id) => {
                      if (id === "ALL_INTERNS") {
                        setAssignTarget({ id: "ALL_INTERNS", name: "All Interns" });
                      } else {
                        const intern = internProgress.find((i) => i.id === id);
                        if (intern) setAssignTarget({ id: intern.id, name: intern.name });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose an intern or all…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_INTERNS" className="font-semibold text-primary">
                        ✨ Assign to ALL Interns
                      </SelectItem>
                      {internProgress.map((i) => {
                        const team = getTeam(i.team);
                        return (
                          <SelectItem key={i.id} value={i.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{i.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {team?.label ?? "No team"} · {i.status}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className={`rounded-lg border px-3 py-2 text-sm ${assignTarget.id === "ALL_INTERNS" ? "border-primary/40 bg-primary/10" : "border-primary/20 bg-primary/5"}`}>
                Assigning to: <span className="font-semibold text-foreground">{assignTarget.name}</span>
                <button className="ml-2 text-xs text-muted-foreground underline" onClick={() => setAssignTarget(null)}>
                  change
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Task Title <span className="text-destructive">*</span></Label>
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="What should they work on?" maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label>Deadline <span className="text-destructive">*</span></Label>
              <Input type="date" value={taskDeadline} min={todayStr} onChange={(e) => setTaskDeadline(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Details <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea value={taskDetail} onChange={(e) => setTaskDetail(e.target.value)} placeholder="Add instructions, resources, or notes…" className="min-h-[100px]" maxLength={2000} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isAssigning}>Cancel</Button>
            <Button onClick={submitAssign} className="btn-gradient" disabled={isAssigning || !assignTarget}>
              {isAssigning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning…</> : <><Plus className="mr-1 h-4 w-4" /> Assign Task</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
