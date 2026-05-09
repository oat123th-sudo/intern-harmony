import { Bell, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";

export function TopHeader() {
  const { currentUser, notifications, markAllRead } = useStore();
  const unread = notifications.filter((n) => !n.read).length;
  const initials = currentUser?.name
    ? currentUser.name.split(" ").map((p) => p[0]).slice(0, 2).join("")
    : "?";

  return (
    <header className="glass-strong sticky top-0 z-30 flex h-16 items-center gap-3 px-5">
      <SidebarTrigger />
      <div className="relative hidden md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search interns, tasks…"
          className="h-9 w-80 rounded-full border-transparent bg-secondary/70 pl-9 transition-all focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu onOpenChange={(o) => o && markAllRead()}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full transition-colors hover:bg-secondary">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-destructive to-rose-500 px-1 text-[10px] font-semibold text-destructive-foreground shadow-sm ring-2 ring-background">
                  {unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96 overflow-hidden rounded-xl border-border/60 p-0 shadow-[var(--shadow-elevated)]">
            <div className="flex items-center justify-between border-b bg-gradient-to-r from-secondary/60 to-transparent px-4 py-3">
              <span className="text-sm font-semibold">Notifications</span>
              <Badge variant="secondary" className="text-xs">{notifications.length} total</Badge>
            </div>
            <ul className="max-h-96 overflow-auto">
              {notifications.map((n) => (
                <li key={n.id} className="border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-secondary/60">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
                </li>
              ))}
            </ul>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-1.5 py-1 backdrop-blur transition-shadow hover:shadow-[var(--shadow-soft)]">
          <Avatar className="h-7 w-7 ring-2 ring-primary/20">
            <AvatarFallback className="bg-[image:var(--gradient-primary)] text-xs font-semibold text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden text-right leading-tight sm:block pr-2">
            <p className="text-xs font-semibold">{currentUser?.name ?? "Guest"}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{currentUser?.role ?? "—"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
