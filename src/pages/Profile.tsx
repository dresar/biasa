import { useState, useEffect } from "react";
import { User, Mail, Calendar, Camera, Save, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  createdAt?: string; // Add this
  email?: string; // Add this
}

export default function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const response = await api.profiles.get();
      if (response.data) {
        setProfile(response.data);
        setFullName(response.data.full_name || "");
        setAvatarUrl(response.data.avatar_url || "");
        setEmail(response.data.email || user.email || "");
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      await api.profiles.update({ 
        full_name: fullName,
        avatar_url: avatarUrl,
        email: email
      });
      await refreshUser(); // Refresh user context for header update
      toast.success("Profil berhasil diperbarui");
      fetchProfile();
      setIsEditing(false); // Disable edit mode after save
    } catch (error: any) {
      toast.error("Gagal memperbarui profil: " + (error.response?.data?.error || error.message));
    }

    setIsSaving(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Memuat profil...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profil</h1>
          <p className="text-muted-foreground">Kelola detail akun Anda</p>
        </div>
        <Button 
          variant={isEditing ? "ghost" : "outline"} 
          onClick={() => {
            if (isEditing) {
              fetchProfile(); // Reset changes if cancelling
              setIsEditing(false);
            } else {
              setIsEditing(true);
            }
          }}
          className="glass"
        >
          {isEditing ? "Batal" : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Edit Profil
            </>
          )}
        </Button>
      </div>

      {/* Profile Card */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center md:flex-row md:items-start gap-8">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-primary/20 group-hover:border-primary/50 transition-colors">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="text-3xl aurora-gradient text-white">
                  {getInitials(fullName || user?.email || "U")}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-6 w-full">
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">URL Foto Profil (CDN)</Label>
                <div className="flex gap-2">
                  <Input
                    id="avatarUrl"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="glass"
                    disabled={!isEditing}
                  />
                  <Button variant="outline" className="glass" onClick={() => window.open(avatarUrl, '_blank')} disabled={!avatarUrl}>
                    Preview
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Masukkan URL gambar langsung dari CDN (ImageKit/Cloudinary) atau sumber lain.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Lengkap</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masukkan nama Anda"
                  className="glass"
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Alamat Email</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="glass"
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label>Anggota Sejak</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {(profile?.createdAt || profile?.created_at)
                      ? new Date(profile?.createdAt || profile?.created_at || "").toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "N/A"}
                  </span>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => { fetchProfile(); setIsEditing(false); }} disabled={isSaving}>
                    Batal
                  </Button>
                  <Button onClick={handleSave} className="aurora-gradient" disabled={isSaving}>
                    {isSaving ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Simpan Perubahan
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardDescription>ID Pengguna</CardDescription>
            <CardTitle className="text-sm font-mono truncate">{user?.id}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardDescription>Penyedia Autentikasi</CardDescription>
            <CardTitle className="text-sm">Email</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardDescription>Status Akun</CardDescription>
            <CardTitle className="text-sm text-green-500">Aktif</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
