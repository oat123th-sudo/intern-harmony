import { useState } from "react";
import { CheckCircle2, Clock, AlertCircle, Eye, MinusCircle, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getTeam } from "@/lib/teams";

interface Task {
  id: string;
  title: string;
  status: string;
  deadline: string;
}

interface InternProgress {
  id: string;
  name: string;
  email: string;
  status: string;
  team?: string;
  tasks: Task[];
}

type ProgressStatus = "no-tasks" | "all-done" | "overdue" | "in-progress";

function getProgressStatus(tasks: Task[]): ProgressStatus {
  if (tasks.length === 0) return "no-tasks";
  const allDone = tasks.every((t) => t.status === "done");
  if (allDone) return "all-done";
  const hasMissedDeadline = tasks.some(
    (t) => t.status !== "done" && new Date(t.deadline) < new Date()
  );
  if (hasMissedDeadline) return "overdue";
  return "in-progress";
}

function ProgressIcon({ status }: { status: ProgressStatus }) {
  switch (status) {
    case "all-done":
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-label="All done" />;
    case "overdue":
      return <AlertCircle className="h-5 w-5 text-destructive" aria-label="Has overdue tasks" />;
    case "in-progress":
      return <Clock className="h-5 w-5 text-primary" aria-label="In progress" />;
    case "no-tasks":
    default:
      return <MinusCircle className="h-5 w-5 text-muted-foreground" aria-label="No tasks" />;
  }
}

export function InternTrackerTable({
  interns,
  onAssignTask,
  showTeam = false,
}: {
  interns: InternProgress[];
  onAssignTask?: (intern: { id: string; name: string }) => void;
  showTeam?: boolean;
}) {
  const [selectedIntern, setSelectedIntern] = useState<InternProgress | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Intern Name</TableHead>
            {showTeam && <TableHead>Team</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {interns.map((intern) => {
            const progressStatus = getProgressStatus(intern.tasks);
            const doneCount = intern.tasks.filter((t) => t.status === "done").length;
            const team = getTeam(intern.team);

            return (
              <TableRow key={intern.id}>
                <TableCell className="font-medium">{intern.name}</TableCell>
                {showTeam && (
                  <TableCell>
                    {team ? (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${team.bg} ${team.color} border ${team.border}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${team.dot}`} />
                        {team.label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <Badge
                    variant={
                      intern.status === "Accepted" || intern.status === "Active"
                        ? "default"
                        : "outline"
                    }
                  >
                    {intern.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {doneCount} / {intern.tasks.length} Done
                </TableCell>
                <TableCell>
                  <ProgressIcon status={progressStatus} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onAssignTask && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-full px-2.5 text-xs"
                        onClick={() => onAssignTask({ id: intern.id, name: intern.name })}
                        aria-label={`Assign task to ${intern.name}`}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Task
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedIntern(intern)}
                      aria-label={`View details for ${intern.name}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {interns.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={showTeam ? 6 : 5}
                className="h-24 text-center text-muted-foreground"
              >
                No interns found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Task detail dialog */}
      <Dialog
        open={!!selectedIntern}
        onOpenChange={(open) => !open && setSelectedIntern(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tracking: {selectedIntern?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedIntern?.tasks.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No tasks assigned yet.
              </p>
            )}
            {selectedIntern?.tasks.map((task) => {
              const isOverdue =
                task.status !== "done" && new Date(task.deadline) < new Date();
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    <p
                      className={`text-xs ${
                        isOverdue
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {isOverdue ? "⚠ Overdue · " : ""}Deadline:{" "}
                      {new Date(task.deadline).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      task.status === "done"
                        ? "default"
                        : task.status === "doing"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {task.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
