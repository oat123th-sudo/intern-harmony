import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { User, Phone, MessageCircle, Facebook, Instagram, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { updateProfileFn, getCurrentUserFn } from "@/api/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_dash/profile")({
  head: () => ({ meta: [{ title: "My Profile — InternHub" }] }),
  component: ProfilePage,
});

type ProfileData = {
  name: string;
  phoneNumber: string;
  lineId: string;
  facebook: string;
  instagram: string;
  resumeUrl: string;
};

function ProfilePage() {
  const { currentUser, setCurrentUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileData>({
    name: currentUser?.name ?? "",
    phoneNumber: "",
    lineId: "",
    facebook: "",
    instagram: "",
    resumeUrl: "",
  });

  // Load latest profile data from DB
  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    getCurrentUserFn({ data: currentUser.id })
      .then((user) => {
        if (!user) return;
        setForm({
          name: (user as any).name ?? "",
          phoneNumber: (user as any).phoneNumber ?? "",
          lineId: (user as any).lineId ?? "",
          facebook: (user as any).facebook ?? "",
          instagram: (user as any).instagram ?? "",
          resumeUrl: (user as any).resumeUrl ?? "",
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  const handleChange = (field: keyof ProfileData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    if (!form.name.trim()) return toast.error("Name cannot be empty");
    setSaving(true);
    try {
      const updated = await updateProfileFn({
        data: {
          id: currentUser.id,
          name: form.name.trim(),
          phoneNumber: form.phoneNumber || undefined,
          lineId: form.lineId || undefined,
          facebook: form.facebook || undefined,
          instagram: form.instagram || undefined,
          resumeUrl: form.resumeUrl || undefined,
        },
      });
      // Sync name back into store so sidebar/header reflects change
      setCurrentUser({ ...currentUser, name: updated.name });
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading profile…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal information and contact details.</p>
      </div>

      {/* Identity Card */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-8 w-8" />
          </div>
          <div>
            <p className="text-lg font-semibold">{currentUser?.name}</p>
            <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
            <Badge variant="secondary" className="mt-1 capitalize">{currentUser?.role}</Badge>
          </div>
        </div>
      </Card>

      {/* Edit Form */}
      <form onSubmit={handleSave}>
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="font-semibold">Personal Information</h2>
            <p className="text-sm text-muted-foreground">Update your name and contact details.</p>
          </div>
          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Full Name */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="profile-name"
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="Your full name"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile-email">Gmail / Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={currentUser?.email ?? ""}
                readOnly
                disabled
                className="cursor-not-allowed bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">Email is your primary identifier and cannot be changed.</p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="profile-phone"
                  value={form.phoneNumber}
                  onChange={handleChange("phoneNumber")}
                  placeholder="0xx-xxx-xxxx"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Line ID */}
            <div className="space-y-2">
              <Label htmlFor="profile-line">Line ID</Label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="profile-line"
                  value={form.lineId}
                  onChange={handleChange("lineId")}
                  placeholder="@your_line_id"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Facebook */}
            <div className="space-y-2">
              <Label htmlFor="profile-facebook">Facebook</Label>
              <div className="relative">
                <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="profile-facebook"
                  value={form.facebook}
                  onChange={handleChange("facebook")}
                  placeholder="facebook.com/yourprofile"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Instagram */}
            <div className="space-y-2">
              <Label htmlFor="profile-instagram">Instagram</Label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="profile-instagram"
                  value={form.instagram}
                  onChange={handleChange("instagram")}
                  placeholder="@your_instagram"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Resume URL */}
          <div className="space-y-2">
            <Label htmlFor="profile-resume">Resume URL</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="profile-resume"
                value={form.resumeUrl}
                onChange={handleChange("resumeUrl")}
                placeholder="https://drive.google.com/..."
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">Paste a link to your resume on Google Drive, Notion, or any public URL.</p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
