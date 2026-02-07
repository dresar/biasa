import { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Database, ExternalLink, Activity, Cloud, Download, Upload, FileJson, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { api } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ImageKit from "imagekit-javascript";

interface StorageCredential {
  id: string;
  name: string;
  provider: "imagekit" | "cloudinary";
  public_key: string;
  private_key_encrypted: string;
  url_endpoint: string;
  is_active: boolean;
  createdAt: string;
}

export default function StorageAccounts() {
  const [accounts, setAccounts] = useState<StorageCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [editingAccount, setEditingAccount] = useState<StorageCredential | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    provider: "imagekit" as "imagekit" | "cloudinary",
    public_key: "",
    private_key: "",
    url_endpoint: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchAccounts();
  }, [user]);

  const fetchAccounts = async () => {
    if (!user) return;

    try {
      const response = await api.storageCredentials.list();
      setAccounts(response.data || []);
    } catch (error) {
      toast.error("Gagal mengambil akun");
    }
    setLoading(false);
  };

  const generateSignature = async (token: string, expire: number, privateKey: string) => {
    try {
      const enc = new TextEncoder();
      const keyData = enc.encode(privateKey);
      const data = enc.encode(token + expire.toString());

      const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-1" },
        false,
        ["sign"]
      );

      const signature = await crypto.subtle.sign("HMAC", key, data);
      
      return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (e) {
      console.error("Signature generation error:", e);
      throw new Error("Gagal membuat signature: Pastikan browser mendukung Web Crypto API");
    }
  };

  const generateCloudinarySignature = async (params: string, secret: string) => {
    try {
      const enc = new TextEncoder();
      const data = enc.encode(params + secret);
      const hashBuffer = await crypto.subtle.digest("SHA-1", data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (e) {
      console.error("Cloudinary signature error:", e);
      throw new Error("Gagal membuat signature Cloudinary");
    }
  };

  const handleTestConnection = async () => {
    if (!formData.public_key || !formData.url_endpoint) {
      toast.error(formData.provider === 'cloudinary' 
        ? "API Key dan Cloud Name wajib diisi" 
        : "Public Key dan URL Endpoint wajib diisi"
      );
      return;
    }

    const privateKeyToUse = formData.private_key;
    if (!privateKeyToUse && !editingAccount) {
       toast.error(formData.provider === 'cloudinary' ? "API Secret wajib diisi" : "Private Key wajib diisi");
       return;
    }
    
    if (editingAccount && !privateKeyToUse) {
      toast.error("Untuk keamanan, Private Key/API Secret tidak dikembalikan dari server. Mohon isi kembali untuk melakukan tes koneksi.");
      return;
    }

    setIsTesting(true);
    const toastId = toast.loading(`Menguji koneksi ke ${formData.provider === 'cloudinary' ? 'Cloudinary' : 'ImageKit'}...`);

    try {
      if (formData.provider === 'cloudinary') {
        // Cloudinary Test Logic
        const timestamp = Math.floor(Date.now() / 1000);
        const paramsStr = `timestamp=${timestamp}`;
        const signature = await generateCloudinarySignature(paramsStr, privateKeyToUse);
        
        // We can't easily upload without a file, but we can verify credentials 
        // by attempting a signed call. Since most endpoints require a file or are admin-only (which need basic auth),
        // we will assume success if we can generate signature and required fields are present.
        // HOWEVER, to be real, we can try to upload a tiny data URI if we want to be sure.
        
        // Let's try to upload a 1x1 pixel gif
        const formDataUpload = new FormData();
        formDataUpload.append("file", "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
        formDataUpload.append("api_key", formData.public_key);
        formDataUpload.append("timestamp", timestamp.toString());
        formDataUpload.append("signature", signature);
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${formData.url_endpoint}/image/upload`, {
          method: "POST",
          body: formDataUpload
        });

        if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.error?.message || "Gagal terhubung ke Cloudinary");
        }
        
        toast.success("Koneksi Cloudinary Berhasil! Kredensial valid.", { id: toastId });

      } else {
        // ImageKit Test Logic
        const token = crypto.randomUUID();
        const expire = Math.floor(Date.now() / 1000) + 2400; // 40 mins
        const signature = await generateSignature(token, expire, privateKeyToUse);

        const imagekit = new ImageKit({
          publicKey: formData.public_key,
          urlEndpoint: formData.url_endpoint,
        });

        const blob = new Blob(["Test Connection"], { type: "text/plain" });
        const file = new File([blob], "test_connection.txt", { type: "text/plain" });

        await new Promise((resolve, reject) => {
          imagekit.upload({
            file: file,
            fileName: "test_connection.txt",
            token: token,
            signature: signature,
            expire: expire,
            folder: "/test_connection",
            useUniqueFileName: true,
          }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });

        toast.success("Koneksi ImageKit Berhasil! Kredensial valid.", { id: toastId });
      }
    } catch (error: any) {
      console.error("Test connection failed:", error);
      toast.error(`Koneksi Gagal: ${error.message || "Periksa kembali kredensial Anda"}`, { id: toastId });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.public_key || !formData.url_endpoint) {
      toast.error("Mohon isi semua kolom yang wajib");
      return;
    }

    if (!editingAccount && !formData.private_key) {
      toast.error(`${formData.provider === 'cloudinary' ? 'API Secret' : 'Private Key'} wajib untuk akun baru`);
      return;
    }

    const payload = {
      name: formData.name,
      provider: formData.provider,
      public_key: formData.public_key,
      url_endpoint: formData.url_endpoint,
      ...(formData.private_key && { private_key_encrypted: formData.private_key }),
    };

    try {
      if (editingAccount) {
        await api.storageCredentials.update(editingAccount.id, payload);
        toast.success("Akun berhasil diperbarui");
      } else {
        await api.storageCredentials.create({ ...payload, private_key_encrypted: formData.private_key });
        toast.success("Akun berhasil dibuat");
        
        await api.activityLogs.create({
          action_type: "account_created",
          details: { account_name: formData.name, provider: formData.provider },
        });
      }
      fetchAccounts();
      resetForm();
    } catch (error) {
      toast.error(editingAccount ? "Gagal memperbarui akun" : "Gagal membuat akun");
    }
  };

  const toggleAccountStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.storageCredentials.update(id, { is_active: !currentStatus });
      toast.success(`Akun ${!currentStatus ? "diaktifkan" : "dinonaktifkan"}`);
      fetchAccounts();
    } catch (error) {
      toast.error("Gagal memperbarui status");
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      await api.storageCredentials.delete(id);
      toast.success("Akun dihapus");
      fetchAccounts();
    } catch (error) {
      toast.error("Gagal menghapus akun");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", provider: "imagekit", public_key: "", private_key: "", url_endpoint: "" });
    setEditingAccount(null);
    setIsDialogOpen(false);
  };

  const openEditDialog = (account: StorageCredential) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      provider: account.provider || "imagekit",
      public_key: account.public_key,
      private_key: "",
      url_endpoint: account.url_endpoint,
    });
    setIsDialogOpen(true);
  };

  const handleExportJSON = () => {
    if (accounts.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    const dataStr = JSON.stringify(accounts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `storage_accounts_backup_${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success("Ekspor JSON berhasil");
  };

  const handleExportCSV = () => {
    if (accounts.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    
    // Define headers
    const headers = ["name", "provider", "public_key", "private_key_encrypted", "url_endpoint", "is_active"];
    
    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...accounts.map(acc => headers.map(header => {
        const val = acc[header as keyof StorageCredential];
        // Escape quotes and wrap in quotes if necessary
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(","))
    ].join("\n");

    const dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(csvContent);
    const exportFileDefaultName = `storage_accounts_backup_${new Date().toISOString().slice(0, 10)}.csv`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success("Ekspor CSV berhasil");
  };

  const downloadTemplate = (provider: "imagekit" | "cloudinary", format: "json" | "csv") => {
    let content = "";
    let filename = `template_${provider}_account.${format}`;
    
    if (format === "json") {
      const templateData = provider === "imagekit" 
        ? [{
            "name": "My ImageKit Account",
            "provider": "imagekit",
            "public_key": "your_public_key_here",
            "private_key_encrypted": "your_private_key_here",
            "url_endpoint": "https://ik.imagekit.io/your_id",
            "is_active": true
          }]
        : [{
            "name": "My Cloudinary Account",
            "provider": "cloudinary",
            "public_key": "your_api_key",
            "private_key_encrypted": "your_api_secret",
            "url_endpoint": "your_cloud_name",
            "is_active": true
          }];
      content = JSON.stringify(templateData, null, 2);
    } else {
      if (provider === "imagekit") {
        content = "name,provider,public_key,private_key_encrypted,url_endpoint,is_active\nMy ImageKit Account,imagekit,your_public_key_here,your_private_key_here,https://ik.imagekit.io/your_id,true";
      } else {
        content = "name,provider,public_key,private_key_encrypted,url_endpoint,is_active\nMy Cloudinary Account,cloudinary,your_api_key,your_api_secret,your_cloud_name,true";
      }
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Template ${provider.charAt(0).toUpperCase() + provider.slice(1)} (${format.toUpperCase()}) diunduh`);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        let importedAccounts: Partial<StorageCredential>[] = [];

        if (file.name.endsWith('.json')) {
          importedAccounts = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          
          importedAccounts = lines.slice(1).filter(l => l.trim()).map(line => {
            // Handle CSV parsing considering quotes
            const values: string[] = [];
            let inQuotes = false;
            let currentValue = "";
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                if (i + 1 < line.length && line[i+1] === '"') {
                  currentValue += '"';
                  i++; // skip next quote
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                values.push(currentValue);
                currentValue = "";
              } else {
                currentValue += char;
              }
            }
            values.push(currentValue); // push last value

            const obj: any = {};
            headers.forEach((h, i) => {
              // Clean up headers just in case
              const cleanHeader = h.replace(/"/g, '');
              if (cleanHeader) obj[cleanHeader] = values[i]?.replace(/^"|"$/g, '');
            });
            return obj;
          });
        } else {
          toast.error("Format file tidak didukung. Gunakan JSON atau CSV.");
          return;
        }

        // Validate and Upload
        let successCount = 0;
        let failCount = 0;
        const toastId = toast.loading(`Mengimpor ${importedAccounts.length} akun...`);

        for (const acc of importedAccounts) {
          try {
            // Basic validation
            if (!acc.name || !acc.public_key || !acc.url_endpoint) {
               failCount++;
               continue;
            }

            // Construct payload compatible with create endpoint
            const payload = {
              name: acc.name,
              provider: acc.provider || "imagekit",
              public_key: acc.public_key,
              url_endpoint: acc.url_endpoint,
              private_key_encrypted: acc.private_key_encrypted || "placeholder_if_missing", // Handle missing private key if exported without it? No, backend sends it.
              is_active: acc.is_active !== undefined ? String(acc.is_active) === 'true' : true
            };

            await api.storageCredentials.create(payload);
            successCount++;
          } catch (err) {
            console.error("Import error", err);
            failCount++;
          }
        }

        toast.dismiss(toastId);
        if (successCount > 0) {
          toast.success(`Berhasil mengimpor ${successCount} akun.`);
          if (failCount > 0) toast.warning(`${failCount} akun gagal diimpor.`);
          fetchAccounts();
        } else {
          toast.error("Gagal mengimpor semua akun.");
        }

      } catch (error) {
        console.error("Parse error", error);
        toast.error("Gagal membaca file impor");
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Akun Penyimpanan</h1>
          <p className="text-muted-foreground">Kelola kredensial penyimpanan ImageKit dan Cloudinary Anda</p>
        </div>
        <div className="flex gap-2">
          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImport} 
            accept=".json,.csv" 
            className="hidden" 
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="glass">
                <Download className="mr-2 h-4 w-4" />
                Backup / Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass-strong">
              <DropdownMenuLabel>Backup & Restore</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleExportJSON} className="cursor-pointer">
                <FileJson className="mr-2 h-4 w-4" /> Export All (JSON)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export All (CSV)
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Download Template</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => downloadTemplate('imagekit', 'json')} className="cursor-pointer">
                <FileJson className="mr-2 h-4 w-4" /> Template ImageKit (JSON)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadTemplate('imagekit', 'csv')} className="cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Template ImageKit (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadTemplate('cloudinary', 'json')} className="cursor-pointer">
                <FileJson className="mr-2 h-4 w-4" /> Template Cloudinary (JSON)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadTemplate('cloudinary', 'csv')} className="cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Template Cloudinary (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" className="glass" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="aurora-gradient">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Akun
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong">
              <DialogHeader>
                <DialogTitle>{editingAccount ? "Edit Akun" : "Tambah Akun Penyimpanan"}</DialogTitle>
                <DialogDescription>
                  {editingAccount
                    ? "Perbarui kredensial penyimpanan Anda"
                    : "Hubungkan akun penyimpanan baru untuk mengunggah berkas"}
                </DialogDescription>
              </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Penyedia Layanan</Label>
                <Select 
                  value={formData.provider} 
                  onValueChange={(value: "imagekit" | "cloudinary") => setFormData({ ...formData, provider: value })}
                >
                  <SelectTrigger id="provider" className="glass">
                    <SelectValue placeholder="Pilih Penyedia" />
                  </SelectTrigger>
                  <SelectContent className="glass-strong">
                    <SelectItem value="imagekit">ImageKit</SelectItem>
                    <SelectItem value="cloudinary">Cloudinary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nama Akun</Label>
                <Input
                  id="name"
                  placeholder={formData.provider === 'imagekit' ? "Akun ImageKit Saya" : "Akun Cloudinary Saya"}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="glass"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="public_key">
                  {formData.provider === 'imagekit' ? 'Public Key' : 'API Key'}
                </Label>
                <Input
                  id="public_key"
                  placeholder={formData.provider === 'imagekit' ? "public_xxx..." : "123456789..."}
                  value={formData.public_key}
                  onChange={(e) => setFormData({ ...formData, public_key: e.target.value })}
                  className="glass"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="private_key">
                  {formData.provider === 'imagekit' ? 'Private Key' : 'API Secret'} {editingAccount && "(kosongkan untuk mempertahankan yang ada)"}
                </Label>
                <Input
                  id="private_key"
                  type="password"
                  placeholder={formData.provider === 'imagekit' ? "private_xxx..." : "secret_xxx..."}
                  value={formData.private_key}
                  onChange={(e) => setFormData({ ...formData, private_key: e.target.value })}
                  className="glass"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url_endpoint">
                  {formData.provider === 'imagekit' ? 'URL Endpoint' : 'Cloud Name'}
                </Label>
                <Input
                  id="url_endpoint"
                  placeholder={formData.provider === 'imagekit' ? "https://ik.imagekit.io/your_id" : "my_cloud_name"}
                  value={formData.url_endpoint}
                  onChange={(e) => setFormData({ ...formData, url_endpoint: e.target.value })}
                  className="glass"
                />
              </div>
            </div>
            <DialogFooter>
              <div className="flex w-full justify-between">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleTestConnection} 
                  disabled={isTesting}
                  className="glass"
                >
                  <Activity className={`mr-2 h-4 w-4 ${isTesting ? "animate-spin" : ""}`} />
                  {isTesting ? "Menguji..." : "Tes Koneksi"}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetForm}>Batal</Button>
                  <Button onClick={handleSubmit} className="aurora-gradient">
                    {editingAccount ? "Perbarui" : "Buat"} Akun
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Accounts Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Memuat akun...</p>
        </div>
      ) : accounts.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-16 w-16 text-muted-foreground/50" />
            <p className="mt-4 text-xl font-medium">Belum ada akun penyimpanan</p>
            <p className="text-muted-foreground">Tambahkan akun penyimpanan pertama Anda untuk mulai mengunggah</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {account.provider === 'cloudinary' ? (
                      <Cloud className="h-5 w-5 text-blue-400" />
                    ) : (
                      <Database className="h-5 w-5 text-cyan-400" />
                    )}
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                  </div>
                  <Badge variant={account.is_active ? "default" : "secondary"}>
                    {account.is_active ? (
                      <><CheckCircle className="mr-1 h-3 w-3" /> Aktif</>
                    ) : (
                      <><XCircle className="mr-1 h-3 w-3" /> Nonaktif</>
                    )}
                  </Badge>
                </div>
                <CardDescription className="truncate">
                  {account.provider === 'cloudinary' ? `Cloud: ${account.url_endpoint}` : account.url_endpoint}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Penyedia</span>
                  <span className="capitalize font-medium">{account.provider || 'imagekit'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Switch
                    checked={account.is_active}
                    onCheckedChange={() => toggleAccountStatus(account.id, account.is_active)}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dibuat</span>
                  <span>{new Date(account.createdAt).toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 glass"
                    onClick={() => openEditDialog(account)}
                  >
                    <Edit2 className="mr-2 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="glass"
                    asChild
                  >
                    <a 
                      href={account.provider === 'cloudinary' ? "https://cloudinary.com/console" : account.url_endpoint} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteAccount(account.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
