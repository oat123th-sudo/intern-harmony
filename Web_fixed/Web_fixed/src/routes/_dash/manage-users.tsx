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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_dash/manage-users")({
  head: () => ({ meta: [{ title: "Manage Users — InternHub" }] }),
  component: ManageUsersPage,
});

type UserRow = { id: string; name: string; email: string; role: string; status?: string };

function ManageUsersPage() {
  const { currentUser } = useStore();
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<UserRow | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsersFn(),
  });

  const updateRoleMutation = useMutation({
    mutationFn: (vars: { id: string; role: string }) =>
      updateUserRoleFn({
        data: {
          id: vars.id,
          role: vars.role as any,
          // Send user ID, not email — server verifies role in DB
          currentUserId: currentUser?.id ?? "",
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User role updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update role");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) =>
      deleteUserFn({
        data: { id, currentUserId: currentUser?.id ?? "" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted");
      setPendingDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete user");
      setPendingDelete(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manage Users</h1>
        <p className="text-sm text-muted-foreground">
          Full control over system accounts, roles, and access.
        </p>
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
                    variant={
                      u.status === "Accepted" || u.status === "Active"
                        ? "default"
                        : u.status === "Rejected"
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {u.status ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={u.role === "admin" || updateRoleMutation.isPending}
                        onClick={() => updateRoleMutation.mutate({ id: u.id, role: "admin" })}
                      >
                        Make Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={u.role === "mentor" || updateRoleMutation.isPending}
                        onClick={() => updateRoleMutation.mutate({ id: u.id, role: "mentor" })}
                      >
                        Make Mentor
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={u.role === "intern" || updateRoleMutation.isPending}
                        onClick={() => updateRoleMutation.mutate({ id: u.id, role: "intern" })}
                      >
                        Make Intern
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        // Prevent deleting self
                        disabled={u.id === currentUser?.id}
                        onClick={() => setPendingDelete(u)}
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
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account for{" "}
              <span className="font-semibold">{pendingDelete?.email}</span> and all
              their associated tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
              onClick={() => pendingDelete && deleteUserMutation.mutate(pendingDelete.id)}
            >
              {deleteUserMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting…</>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
