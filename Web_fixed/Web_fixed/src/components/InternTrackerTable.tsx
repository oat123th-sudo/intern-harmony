import { useState } from "react";
import { CheckCircle2, Clock, AlertCircle, Eye, MinusCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

export function InternTrackerTable({ interns }: { interns: InternProgress[] }) {
  const [selectedIntern, setSelectedIntern] = useState<InternProgress | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Intern Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="w-12 text-right">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {interns.map((intern) => {
            const progressStatus = getProgressStatus(intern.tasks);
            const doneCount = intern.tasks.filter((t) => t.status === "done").length;

            return (
              <TableRow key={intern.id}>
                <TableCell className="font-medium">{intern.name}</TableCell>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedIntern(intern)}
                    aria-label={`View details for ${intern.name}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {interns.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-muted-foreground"
              >
                No interns found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

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
