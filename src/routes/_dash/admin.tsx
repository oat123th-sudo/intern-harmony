import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, TrendingUp, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUsersFn, getInternProgressFn } from "@/api/users";
import { InternTrackerTable } from "@/components/InternTrackerTable";

export const Route = createFileRoute("/_dash/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — InternHub" }] }),
  component: AdminDashboard,
});

function StatCard({ title, value, hint, icon: Icon, accent }: any) {
  return (
    <Card className="relative overflow-hidden p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function AdminDashboard() {
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => getUsersFn() });
  const { data: internProgress = [] } = useQuery({ queryKey: ["internProgress"], queryFn: () => getInternProgressFn() });

  const total = users.filter((u) => u.role === "intern").length;
  const accepted = users.filter((u) => u.role === "intern" && u.status === "Accepted").length;
  const active = users.filter((u) => u.role === "intern" && u.status === "Active").length;
  const completion = total ? Math.round(((accepted + active) / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of program performance and user management.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Applicants" value={total} hint="All-time intern signups" icon={Users} accent="bg-primary/10 text-primary" />
        <StatCard title="Accepted Interns" value={accepted + active} hint="Currently or previously accepted" icon={UserCheck} accent="bg-success/15 text-success" />
        <StatCard title="Completion Rate" value={`${completion}%`} hint="Accepted vs applied" icon={TrendingUp} accent="bg-warning/20 text-warning-foreground" />
        <StatCard title="Active Mentors" value={users.filter((u) => u.role === "mentor").length} hint="Available for matching" icon={GraduationCap} accent="bg-accent text-accent-foreground" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-base font-semibold">Intern Tracking</h2>
            <p className="text-xs text-muted-foreground">Monitor tasks, progress, and deadlines for all interns.</p>
          </div>
        </div>
        <InternTrackerTable interns={internProgress} />
      </Card>
    </div>
  );
}
