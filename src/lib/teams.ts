// ─── Team Definitions (Single source of truth) ────────────────────────────────

export const TEAMS = [
  {
    id: "team-1",
    label: "AI & Data Science",
    description: "Machine learning, data analysis, and AI-powered projects",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  {
    id: "team-2",
    label: "Web Development",
    description: "Frontend and backend web applications",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  {
    id: "team-3",
    label: "Mobile Development",
    description: "iOS and Android mobile applications",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    id: "team-4",
    label: "UI/UX & Design",
    description: "User interface design and user experience research",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
] as const;

export type TeamId = (typeof TEAMS)[number]["id"];

export function getTeam(id: string | undefined) {
  return TEAMS.find((t) => t.id === id);
}
