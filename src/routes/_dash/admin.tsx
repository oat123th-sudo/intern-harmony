import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Users, UserCheck, TrendingUp, GraduationCap } from "lucide-react";
import { useStore, type Role } from "@/lib/store";
import { toast } from "sonner";

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
  const { users, setUsers } = useStore();
  const total = users.filter((u) => u.role === "intern").length;
  const accepted = users.filter((u) => u.role === "intern" && u.status === "Accepted").length;
  const active = users.filter((u) => u.role === "intern" && u.status === "Active").length;
  const completion = total ? Math.round(((accepted + active) / total) * 100) : 0;

  const changeRole = (id: string, role: Role) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, role } : u)));
    toast.success(`Role updated to ${role}`);
  };

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
            <h2 className="text-base font-semibold">Users</h2>
            <p className="text-xs text-muted-foreground">Manage roles and access across the platform.</p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className="capitalize"
                    variant={u.status === "Accepted" || u.status === "Active" ? "default" : u.status === "Rejected" ? "destructive" : "outline"}
                  >
                    {u.status ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Change role</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => changeRole(u.id, "admin")}>Admin</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => changeRole(u.id, "mentor")}>Mentor</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => changeRole(u.id, "intern")}>Intern</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
