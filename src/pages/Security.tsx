import { useState } from "react";
import { Shield, Key, Smartphone, Lock, Eye, EyeOff, Save, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { api } from "@/api/client";

export default function Security() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Kata sandi baru tidak cocok");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Kata sandi harus minimal 6 karakter");
      return;
    }

    setIsSaving(true);

    try {
      await api.auth.updatePassword({ password: newPassword });
      toast.success("Kata sandi berhasil diperbarui");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Gagal memperbarui kata sandi: " + (error.response?.data?.error || error.message));
    }

    setIsSaving(false);
  };

  const securityChecks = [
    { label: "Kata sandi kuat diatur", status: true },
    { label: "Email terverifikasi", status: true },
    { label: "Tinjauan keamanan terbaru", status: true },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Keamanan</h1>
        <p className="text-muted-foreground">Kelola pengaturan keamanan akun Anda</p>
      </div>

      {/* Security Overview */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Ikhtisar Keamanan
          </CardTitle>
          <CardDescription>Status keamanan akun Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {securityChecks.map((check) => (
              <div key={check.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                {check.status ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <span>{check.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Ubah Kata Sandi
          </CardTitle>
          <CardDescription>Perbarui kata sandi akun Anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Kata Sandi Saat Ini</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="glass pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Kata Sandi Baru</Label>
              <Input
                id="newPassword"
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="glass"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi Baru</Label>
              <Input
                id="confirmPassword"
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glass"
              />
            </div>
          </div>

          <Button
            onClick={handlePasswordChange}
            className="aurora-gradient"
            disabled={isSaving || !newPassword || !confirmPassword}
          >
            {isSaving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Perbarui Kata Sandi
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Sesi Aktif
          </CardTitle>
          <CardDescription>Kelola sesi login aktif Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Sesi Saat Ini</p>
                  <p className="text-sm text-muted-foreground">
                    Perangkat ini • Aktif sekarang
                  </p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded-full">
                Saat Ini
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
