import { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

export function InternTrackerTable({ interns }: { interns: InternProgress[] }) {
  const [selectedIntern, setSelectedIntern] = useState<InternProgress | null>(null);

  const getStatusIcon = (tasks: Task[]) => {
    if (tasks.length === 0) return <CheckCircle2 className="h-5 w-5 text-success" />;
    
    const allDone = tasks.every((t) => t.status === "done");
    if (allDone) return <CheckCircle2 className="h-5 w-5 text-success" />;

    const hasMissedDeadline = tasks.some((t) => t.status !== "done" && new Date(t.deadline) < new Date());
    if (hasMissedDeadline) return <AlertCircle className="h-5 w-5 text-destructive" />;

    return <XCircle className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Intern Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead className="w-12 text-right">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {interns.map((intern) => (
            <TableRow key={intern.id}>
              <TableCell className="font-medium flex items-center gap-2">
                {intern.name}
                {getStatusIcon(intern.tasks)}
              </TableCell>
              <TableCell>
                <Badge variant={intern.status === "Accepted" ? "default" : "outline"}>{intern.status}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {intern.tasks.filter((t) => t.status === "done").length} / {intern.tasks.length} Done
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => setSelectedIntern(intern)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {interns.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No interns found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!selectedIntern} onOpenChange={(open) => !open && setSelectedIntern(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tracking: {selectedIntern?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedIntern?.tasks.length === 0 && (
              <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
            )}
            {selectedIntern?.tasks.map((task) => {
              const isOverdue = task.status !== "done" && new Date(task.deadline) < new Date();
              return (
                <div key={task.id} className="rounded-lg border p-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      Deadline: {new Date(task.deadline).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={task.status === "done" ? "default" : task.status === "doing" ? "secondary" : "outline"}>
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
