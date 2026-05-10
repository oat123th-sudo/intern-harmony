import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Check, X, Sparkles, Loader2, Plus, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApplicantsFn, updateApplicantStatusFn, getInternProgressFn } from "@/api/users";
import { assignTaskFn, assignTaskManyFn } from "@/api/tasks";
import { useStore } from "@/lib/store";
import { getTeam } from "@/lib/teams";
import { InternTrackerTable } from "@/components/InternTrackerTable";

export const Route = createFileRoute("/_dash/mentor")({
  head: () => ({ meta: [{ title: "Mentor Dashboard — InternHub" }] }),
  component: MentorDashboard,
});

type AssignTarget = { id: string; name: string } | null;

function MentorDashboard() {
  const { currentUser } = useStore();
  const queryClient = useQueryClient();
  const team = getTeam(currentUser?.team);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AssignTarget>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDetail, setTaskDetail] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: applicants = [], isLoading: loadingApplicants } = useQuery({
    queryKey: ["applicants", currentUser?.team],
    queryFn: () => getApplicantsFn(),
    select: (data) => currentUser?.team ? data.filter((a: any) => a.team === currentUser.team) : data,
  });

  const { data: internProgress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ["internProgress", currentUser?.team],
    queryFn: () => getInternProgressFn({ data: currentUser?.team ?? "" }),
  });

  const decideMutation = useMutation({
    mutationFn: (vars: { id: string; accept: boolean }) => updateApplicantStatusFn({ data: vars }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["applicants", currentUser?.team] });
      queryClient.invalidateQueries({ queryKey: ["internProgress", currentUser?.team] });
      toast[vars.accept ? "success" : "info"](vars.accept ? "Applicant accepted" : "Applicant rejected");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update applicant status"),
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
      queryClient.invalidateQueries({ queryKey: ["internProgress", currentUser?.team] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      closeDialog();
      toast.success("Task assigned successfully");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to assign task"),
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
      queryClient.invalidateQueries({ queryKey: ["internProgress", currentUser?.team] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      closeDialog();
      toast.success(`Task assigned to ${data.count} team members`);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to assign bulk tasks"),
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

    if (assignTarget.id === "ALL_TEAM_INTERNS") {
      const teamInternIds = internProgress.map(i => i.id);
      if (teamInternIds.length === 0) return toast.error("No active interns in your team to assign tasks to.");
      assignManyMutation.mutate({
        internIds: teamInternIds,
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Mentor <span className="text-gradient-primary">Dashboard</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Review applicants and manage your team's tasks.</p>
          {team && (
            <div className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${team.bg} ${team.color} border ${team.border}`}>
              <span className={`h-2 w-2 rounded-full ${team.dot}`} />
              Team: {team.label}
            </div>
          )}
        </div>
        <Button className="btn-gradient h-10 rounded-full px-5 font-medium" onClick={() => openDialog()}>
          <Plus className="mr-1 h-4 w-4" /> Assign Task
        </Button>
      </div>

      <Tabs defaultValue="applicants">
        <TabsList className="rounded-full bg-secondary/70 p-1">
          <TabsTrigger value="applicants" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Applicants
            {applicants.length > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{applicants.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="team" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
            My Team
            {internProgress.length > 0 && <span className="ml-1.5 rounded-full bg-secondary px-1.5 text-[10px] font-semibold text-muted-foreground">{internProgress.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applicants" className="mt-5">
          {loadingApplicants ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading applicants…
            </div>
          ) : applicants.length === 0 ? (
            <Card className="border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground backdrop-blur">
              All caught up — no pending applicants in your team.
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {applicants.map((a: any) => (
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
                        <div className="flex items-center gap-1 rounded-full bg-[image:var(--gradient-primary)] px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                          <Sparkles className="h-3 w-3" /> AI 85
                        </div>
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
              <InternTrackerTable interns={internProgress} onAssignTask={(intern) => openDialog(intern)} />
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {assignTarget && assignTarget.id !== "ALL_TEAM_INTERNS" ? `Assign Task to ${assignTarget.name}` : "Assign Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!assignTarget ? (
              <div className="space-y-1.5">
                <Label>Select Intern <span className="text-destructive">*</span></Label>
                {internProgress.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/60 py-4 text-center text-sm text-muted-foreground">
                    No interns in your team yet.
                  </p>
                ) : (
                  <Select
                    onValueChange={(id) => {
                      if (id === "ALL_TEAM_INTERNS") {
                        setAssignTarget({ id: "ALL_TEAM_INTERNS", name: "All Team Members" });
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
                      <SelectItem value="ALL_TEAM_INTERNS" className="font-semibold text-primary">
                        ✨ Assign to ALL Team Members
                      </SelectItem>
                      {internProgress.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{i.name}</span>
                            <span className="text-xs text-muted-foreground">{i.status}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className={`rounded-lg border px-3 py-2 text-sm ${assignTarget.id === "ALL_TEAM_INTERNS" ? "border-primary/40 bg-primary/10" : "border-primary/20 bg-primary/5"}`}>
                Assigning to: <span className="font-semibold text-foreground">{assignTarget.name}</span>
                <button className="ml-2 text-xs text-muted-foreground underline" onClick={() => setAssignTarget(null)}>change</button>
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
