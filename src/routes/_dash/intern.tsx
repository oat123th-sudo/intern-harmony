import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, ExternalLink, MessageSquare, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTasksFn, createTaskFn, updateTaskStatusFn } from "@/api/tasks";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/_dash/intern")({
  head: () => ({ meta: [{ title: "Intern Dashboard — InternHub" }] }),
  component: InternDashboard,
});

type TaskData = { id: string; title: string; detail?: string; status: "todo" | "doing" | "done"; deadline: string; timeOfDay: string; createdAt: string; };

const COLUMNS: { key: TaskData["status"]; label: string; tone: string }[] = [
  { key: "todo", label: "To-do", tone: "bg-muted text-muted-foreground" },
  { key: "doing", label: "Doing", tone: "bg-primary/10 text-primary" },
  { key: "done", label: "Done", tone: "bg-success/15 text-success" },
];

function TaskCard({ task, move }: { task: TaskData; move: (id: string, status: TaskData["status"]) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isOverdue = task.status !== "done" && new Date(task.deadline) < new Date();

  return (
    <div className="rounded-lg border bg-background p-3 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium">{task.title}</p>
          <p className={`text-xs mt-1 ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
            Deadline: {new Date(task.deadline).toLocaleDateString()}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      {expanded && (
        <div className="mt-3 space-y-2 border-t pt-2 text-xs text-muted-foreground">
          <p><span className="font-semibold text-foreground">Added:</span> {new Date(task.createdAt).toLocaleDateString()} ({task.timeOfDay})</p>
          {task.detail && (
            <div className="whitespace-pre-wrap"><span className="font-semibold text-foreground">Details:</span><br/>{task.detail}</div>
          )}
        </div>
      )}
      <Select value={task.status} onValueChange={(v) => move(task.id, v as TaskData["status"])}>
        <SelectTrigger className="mt-2 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todo">To-do</SelectItem>
          <SelectItem value="doing">Doing</SelectItem>
          <SelectItem value="done">Done</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function InternDashboard() {
  const { currentUser } = useStore();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [deadline, setDeadline] = useState("");

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", currentUser?.id],
    queryFn: () => getTasksFn({ data: currentUser?.id || "" }),
    enabled: !!currentUser?.id,
  });

  const total = tasks.length;
  const done = tasks.filter((t: any) => t.status === "done").length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  const createMutation = useMutation({
    mutationFn: (vars: any) => createTaskFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", currentUser?.id] });
      setTitle("");
      setDetail("");
      setDeadline("");
      setOpen(false);
      toast.success("Task added");
    }
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; status: "todo" | "doing" | "done" }) => updateTaskStatusFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", currentUser?.id] });
    }
  });

  const addTask = () => {
    if (!title.trim() || !deadline) {
      toast.error("Title and Deadline are required");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      detail: detail.trim() || undefined,
      deadline,
      userId: currentUser?.id,
    });
  };

  const move = (id: string, status: TaskData["status"]) => updateMutation.mutate({ id, status });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {currentUser?.name?.split(" ")[0] ?? "Intern"} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Here's a quick look at your internship progress.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Add task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you working on?" />
              <div className="space-y-1">
                <p className="text-xs font-medium">Deadline</p>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Add some details (optional)..." className="min-h-[100px]" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={addTask}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-2 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Project completion</p>
              <p className="mt-1 text-3xl font-semibold">{progress}%</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Trophy className="h-6 w-6" />
            </div>
          </div>
          <Progress value={progress} className="mt-4 h-2" />
          <p className="mt-2 text-xs text-muted-foreground">{done} of {total} tasks complete</p>
        </Card>
        <Card className="flex flex-col justify-between bg-[image:var(--gradient-primary)] p-6 text-primary-foreground">
          <div>
            <div className="flex items-center gap-2 text-sm opacity-90">
              <MessageSquare className="h-4 w-4" /> Community
            </div>
            <h3 className="mt-2 text-lg font-semibold leading-snug">Join the official Line group</h3>
            <p className="mt-1 text-sm opacity-90">Get updates, ask questions, and find job opportunities.</p>
          </div>
          <Button asChild variant="secondary" className="mt-4 w-fit">
            <a href="https://line.me/R/ti/g/" target="_blank" rel="noreferrer">
              Join Official Line Group <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Project Tracker</h2>
        <p className="text-sm text-muted-foreground">Drag through stages — or use the dropdown to update status.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = tasks.filter((t: any) => t.status === col.key);
            return (
              <div key={col.key} className="rounded-xl border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${col.tone}`}>{col.label}</span>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {items.map((t: any) => (
                    <TaskCard key={t.id} task={t} move={move} />
                  ))}
                  {items.length === 0 && (
                    <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">No tasks</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
