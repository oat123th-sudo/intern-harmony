import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsersFn, updateUserRoleFn, deleteUserFn } from "@/api/users";
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
import { MoreHorizontal, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/_dash/manage-users")({
  head: () => ({ meta: [{ title: "Manage Users — InternHub" }] }),
  component: ManageUsersPage,
});

function ManageUsersPage() {
  const { currentUser } = useStore();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsersFn(),
  });

  const updateRoleMutation = useMutation({
    mutationFn: (vars: { id: string; role: string }) => 
      updateUserRoleFn({ data: { id: vars.id, role: vars.role, currentUserEmail: currentUser?.email || "" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User role updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update role");
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => 
      deleteUserFn({ data: { id, currentUserEmail: currentUser?.email || "" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted completely");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete user");
    }
  });

  if (isLoading) return <div className="p-6">Loading users...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manage Users</h1>
        <p className="text-sm text-muted-foreground">Full control over system accounts, roles, and access.</p>
      </div>

      <Card className="overflow-hidden">
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
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ id: u.id, role: "admin" })}>Make Admin</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ id: u.id, role: "mentor" })}>Make Mentor</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ id: u.id, role: "intern" })}>Make Intern</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive" 
                        onClick={() => deleteUserMutation.mutate(u.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No users found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
