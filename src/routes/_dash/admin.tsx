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

function StatCard({ title, value, hint, icon: Icon, accent, ring }: any) {
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

function AdminDashboard() {
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => getUsersFn() });
  const { data: internProgress = [] } = useQuery({ queryKey: ["internProgress"], queryFn: () => getInternProgressFn() });

  const total = users.filter((u) => u.role === "intern").length;
  const accepted = users.filter((u) => u.role === "intern" && u.status === "Accepted").length;
  const active = users.filter((u) => u.role === "intern" && u.status === "Active").length;
  const completion = total ? Math.round(((accepted + active) / total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin <span className="text-gradient-primary">Dashboard</span></h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Overview of program performance and user management.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Applicants" value={total} hint="All-time intern signups" icon={Users}
          accent="bg-[image:var(--gradient-primary)] text-primary-foreground" ring="bg-primary/20" />
        <StatCard title="Accepted Interns" value={accepted + active} hint="Currently or previously accepted" icon={UserCheck}
          accent="bg-emerald-500 text-white" ring="bg-emerald-300/30" />
        <StatCard title="Completion Rate" value={`${completion}%`} hint="Accepted vs applied" icon={TrendingUp}
          accent="bg-amber-500 text-white" ring="bg-amber-300/30" />
        <StatCard title="Active Mentors" value={users.filter((u) => u.role === "mentor").length} hint="Available for matching" icon={GraduationCap}
          accent="bg-sky-500 text-white" ring="bg-sky-300/30" />
      </div>

      <Card className="overflow-hidden border-border/60 bg-card/80 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-secondary/40 to-transparent p-5">
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
