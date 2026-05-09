import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MessageSquare, Trophy, ChevronDown, ChevronUp, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTasksFn, updateTaskStatusFn } from "@/api/tasks";
import { useStore } from "@/lib/store";
import { getTeam } from "@/lib/teams";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_dash/intern")({
  head: () => ({ meta: [{ title: "Intern Dashboard — InternHub" }] }),
  component: InternDashboard,
});

type TaskData = {
  id: string;
  title: string;
  detail?: string;
  status: "todo" | "doing" | "done";
  deadline: string;
  timeOfDay: string;
  createdAt: string;
};

const COLUMNS: { key: TaskData["status"]; label: string; dot: string; bar: string }[] = [
  { key: "todo", label: "To-do", dot: "bg-slate-400", bar: "from-slate-300 to-slate-200" },
  { key: "doing", label: "In progress", dot: "bg-primary", bar: "from-primary to-primary-glow" },
  { key: "done", label: "Done", dot: "bg-emerald-500", bar: "from-emerald-400 to-emerald-300" },
];

function TaskCard({
  task,
  move,
  isMoving,
}: {
  task: TaskData;
  move: (id: string, status: TaskData["status"]) => void;
  isMoving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isOverdue =
    task.status !== "done" && new Date(task.deadline) < new Date();

  return (
    <div className="hover-lift group rounded-xl border border-border/60 bg-card p-3.5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          <p
            className={`mt-1.5 text-[11px] ${
              isOverdue
                ? "font-semibold text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {isOverdue ? "⚠ Overdue · " : ""}Due{" "}
            {new Date(task.deadline).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>
      {expanded && (
        <div className="mt-3 space-y-2 border-t pt-2 text-xs text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Added:</span>{" "}
            {new Date(task.createdAt).toLocaleDateString()} ({task.timeOfDay})
          </p>
          {task.detail && (
            <div className="whitespace-pre-wrap">
              <span className="font-semibold text-foreground">Details:</span>
              <br />
              {task.detail}
            </div>
          )}
        </div>
      )}
      {/* Intern can move task status themselves */}
      <Select
        value={task.status}
        onValueChange={(v) => move(task.id, v as TaskData["status"])}
        disabled={isMoving}
      >
        <SelectTrigger className="mt-3 h-8 rounded-lg border-border/60 bg-secondary/50 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todo">To-do</SelectItem>
          <SelectItem value="doing">In progress</SelectItem>
          <SelectItem value="done">Done</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function InternDashboard() {
  const { currentUser } = useStore();
  const queryClient = useQueryClient();

  const team = getTeam(currentUser?.team);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", currentUser?.id],
    queryFn: () => getTasksFn({ data: currentUser?.id ?? "" }),
    enabled: !!currentUser?.id,
  });

  const total = tasks.length;
  const done = tasks.filter((t: any) => t.status === "done").length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; status: "todo" | "doing" | "done" }) =>
      updateTaskStatusFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", currentUser?.id] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update task status");
    },
  });

  const move = (id: string, status: TaskData["status"]) =>
    updateMutation.mutate({ id, status });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back,{" "}
            <span className="text-gradient-primary">
              {currentUser?.name?.split(" ")[0] ?? "Intern"}
            </span>{" "}
            👋
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Here's a quick look at your internship progress.
          </p>
          {team && (
            <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${team.bg} ${team.color} border ${team.border}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${team.dot}`} />
              {team.label}
            </div>
          )}
        </div>
      </div>

      {/* ── Task notice banner ── */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Tasks are assigned by your <span className="font-medium text-foreground">Mentor</span> or{" "}
          <span className="font-medium text-foreground">Admin</span>. You can update the status of each task as you progress.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="hover-lift col-span-2 overflow-hidden border-border/60 bg-[image:var(--gradient-card)] p-6 shadow-[var(--shadow-soft)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Project completion
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">
                {progress}
                <span className="text-2xl text-muted-foreground">%</span>
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
              <Trophy className="h-6 w-6" />
            </div>
          </div>
          <Progress value={progress} className="mt-5 h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {done} of {total} tasks complete
          </p>
        </Card>

        <Card className="hover-lift relative flex flex-col justify-between overflow-hidden border-0 bg-[image:var(--gradient-primary)] p-6 text-primary-foreground shadow-[var(--shadow-glow)]">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90">
              <MessageSquare className="h-3.5 w-3.5" /> Community
            </div>
            <h3 className="mt-2 text-lg font-semibold leading-snug">
              Join the official Line group
            </h3>
            <p className="mt-1 text-sm opacity-90">
              Get updates, ask questions, and find job opportunities.
            </p>
          </div>
          <Button
            asChild
            variant="secondary"
            className="relative mt-4 w-fit rounded-full bg-white text-primary hover:bg-white/90"
          >
            <a
              href="https://line.me/R/ti/g/"
              target="_blank"
              rel="noreferrer noopener"
            >
              Join Line Group <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </Card>
      </div>

      <div>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Project Tracker
            </h2>
            <p className="text-sm text-muted-foreground">
              Move tasks across stages as you progress.
            </p>
          </div>
        </div>

        {tasksLoading ? (
          <div className="mt-5 flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks…
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {COLUMNS.map((col) => {
              const items = tasks.filter((t: any) => t.status === col.key);
              return (
                <div
                  key={col.key}
                  className="rounded-2xl border border-border/60 bg-[image:var(--gradient-card)] p-4 shadow-[var(--shadow-soft)] backdrop-blur"
                >
                  <div
                    className={`mb-3 h-1 rounded-full bg-gradient-to-r ${col.bar}`}
                  />
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${col.dot}`}
                      />
                      <span className="text-sm font-semibold">{col.label}</span>
                      <span className="rounded-full bg-secondary px-1.5 text-[11px] font-medium text-muted-foreground">
                        {items.length}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {items.map((t: any) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        move={move}
                        isMoving={updateMutation.isPending}
                      />
                    ))}
                    {items.length === 0 && (
                      <p className="rounded-xl border border-dashed border-border/60 py-8 text-center text-xs text-muted-foreground">
                        No tasks here yet
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
