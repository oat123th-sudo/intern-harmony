import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, UserCheck, TrendingUp, GraduationCap, Loader2, ClipboardList, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsersFn, getInternProgressFn } from "@/api/users";
import { assignTaskFn } from "@/api/tasks";
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

  // Dialog state — null = open with picker, object = pre-filled intern
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

  const { data: internProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: ["internProgress", selectedTeam],
    queryFn: () =>
      getInternProgressFn({ data: selectedTeam === "all" ? "" : selectedTeam }),
  });

  const assignMutation = useMutation({
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
    const target = assignTarget;
    if (!target) return toast.error("Please select an intern");
    assignMutation.mutate({
      internId: target.id,
      title: taskTitle.trim(),
      detail: taskDetail.trim() || undefined,
      deadline: taskDeadline,
    });
  };

  // All interns for the picker dropdown
  const allInterns = internProgress;

  const interns = users.filter((u) => u.role === "intern");
  const total = interns.length;
  const accepted = interns.filter((u) => u.status === "Accepted").length;
  const active = interns.filter((u) => u.status === "Active").length;
  const mentors = users.filter((u) => u.role === "mentor").length;
  const completion = total ? Math.round(((accepted + active) / total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Admin <span className="text-gradient-primary">Dashboard</span>
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Overview of program performance and user management.
        </p>
      </div>

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
        {/* ── Tracking Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-gradient-to-r from-secondary/40 to-transparent p-5">
          <div>
            <h2 className="text-base font-semibold">Intern Tracking</h2>
            <p className="text-xs text-muted-foreground">
              Monitor tasks, assign work, and track deadlines for all interns.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Team Filter */}
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
            {/* ── Assign Task Button (always visible) ── */}
            <Button
              className="btn-gradient h-9 rounded-full px-4 text-sm font-medium"
              onClick={() => openDialog()}
            >
              <Plus className="mr-1 h-4 w-4" /> Assign Task
            </Button>
          </div>
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

      {/* ── Assign Task Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {assignTarget ? `Assign Task to ${assignTarget.name}` : "Assign Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Intern picker — show when no pre-selected intern */}
            {!assignTarget ? (
              <div className="space-y-1.5">
                <Label>Select Intern <span className="text-destructive">*</span></Label>
                {allInterns.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/60 py-4 text-center text-sm text-muted-foreground">
                    No interns found. Ask interns to sign up first.
                  </p>
                ) : (
                  <Select
                    value={assignTarget ? (assignTarget as any).id : ""}
                    onValueChange={(id) => {
                      const intern = allInterns.find((i) => i.id === id);
                      if (intern) setAssignTarget({ id: intern.id, name: intern.name });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose an intern…" />
                    </SelectTrigger>
                    <SelectContent>
                      {allInterns.map((i) => {
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
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                Assigning to: <span className="font-semibold text-foreground">{assignTarget.name}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Task Title <span className="text-destructive">*</span></Label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="What should the intern work on?"
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Deadline <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={taskDeadline}
                min={todayStr}
                onChange={(e) => setTaskDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Details <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                value={taskDetail}
                onChange={(e) => setTaskDetail(e.target.value)}
                placeholder="Add instructions, resources, or notes…"
                className="min-h-[100px]"
                maxLength={2000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={assignMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={submitAssign}
              className="btn-gradient"
              disabled={assignMutation.isPending || (!assignTarget)}
            >
              {assignMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning…</>
              ) : (
                <><Plus className="mr-1 h-4 w-4" /> Assign Task</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
