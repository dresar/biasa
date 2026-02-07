import { useState } from "react";
import { Settings, Save, RefreshCw, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function ApiConfig() {
  const [settings, setSettings] = useState({
    defaultUploadFolder: "/uploads",
    autoOptimize: true,
    compressionQuality: "80",
    maxFileSize: "10",
    rateLimit: "100",
    apiTimeout: "30",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Pengaturan berhasil disimpan");
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Konfigurasi API</h1>
          <p className="text-muted-foreground">Konfigurasi pengaturan global untuk integrasi penyimpanan Anda</p>
        </div>
        <Button onClick={handleSave} className="aurora-gradient" disabled={isSaving}>
          {isSaving ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Simpan Perubahan
        </Button>
      </div>

      {/* Upload Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pengaturan Unggah
          </CardTitle>
          <CardDescription>Konfigurasi perilaku unggah default</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="folder">Folder Unggah Default</Label>
              <Input
                id="folder"
                value={settings.defaultUploadFolder}
                onChange={(e) => setSettings({ ...settings, defaultUploadFolder: e.target.value })}
                className="glass"
              />
              <p className="text-xs text-muted-foreground">Path tempat berkas akan disimpan secara default</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxSize">Ukuran Berkas Maksimal (MB)</Label>
              <Input
                id="maxSize"
                type="number"
                value={settings.maxFileSize}
                onChange={(e) => setSettings({ ...settings, maxFileSize: e.target.value })}
                className="glass"
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Optimasi Otomatis Gambar</Label>
              <p className="text-sm text-muted-foreground">
                Otomatis mengoptimalkan gambar yang diunggah untuk web
              </p>
            </div>
            <Switch
              checked={settings.autoOptimize}
              onCheckedChange={(checked) => setSettings({ ...settings, autoOptimize: checked })}
            />
          </div>

          {settings.autoOptimize && (
            <div className="space-y-2">
              <Label>Kualitas Kompresi</Label>
              <Select
                value={settings.compressionQuality}
                onValueChange={(value) => setSettings({ ...settings, compressionQuality: value })}
              >
                <SelectTrigger className="w-40 glass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-strong">
                  <SelectItem value="60">Rendah (60%)</SelectItem>
                  <SelectItem value="80">Sedang (80%)</SelectItem>
                  <SelectItem value="90">Tinggi (90%)</SelectItem>
                  <SelectItem value="100">Asli (100%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Pembatasan Rate
          </CardTitle>
          <CardDescription>Konfigurasi batas rate dan timeout API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rateLimit">Batas Rate (permintaan/menit)</Label>
              <Input
                id="rateLimit"
                type="number"
                value={settings.rateLimit}
                onChange={(e) => setSettings({ ...settings, rateLimit: e.target.value })}
                className="glass"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout API (detik)</Label>
              <Input
                id="timeout"
                type="number"
                value={settings.apiTimeout}
                onChange={(e) => setSettings({ ...settings, apiTimeout: e.target.value })}
                className="glass"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
