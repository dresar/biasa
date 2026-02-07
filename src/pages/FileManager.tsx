import { useState, useEffect, useRef } from "react";
import { Search, Grid, List, FileIcon, Image, Video, FileText, Trash2, Download, Eye, Copy, Filter, Upload, FileJson, FileSpreadsheet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { api } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface FileItem {
  id: string;
  name: string;
  url: string;
  file_type: string | null;
  size: number;
  created_at: string;
  storage_account_id: string | null;
  file_id: string | null;
}

export default function FileManager() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [storageAccounts, setStorageAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetchFiles();
    fetchStorageAccounts();
    // Realtime subscription removed in SQLite migration
  }, [user]);

  useEffect(() => {
    filterFiles();
  }, [files, searchQuery, typeFilter, dateFilter, sizeFilter, accountFilter]);

  const fetchFiles = async () => {
    if (!user) return;
    try {
      const response = await api.files.list();
      setFiles(response.data || []);
    } catch (error) {
      toast.error("Gagal mengambil berkas");
    }
    setLoading(false);
  };

  const fetchStorageAccounts = async () => {
    try {
      const response = await api.storageCredentials.list();
      setStorageAccounts(response.data || []);
    } catch (error) {
      console.error("Gagal mengambil akun penyimpanan", error);
    }
  };

  const filterFiles = () => {
    let result = [...files];

    // Search
    if (searchQuery) {
      result = result.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Storage Account Filter
    if (accountFilter !== "all") {
      result = result.filter((f) => f.storage_account_id === accountFilter);
    }

    // Type Filter
    if (typeFilter !== "all") {
      result = result.filter((f) => f.file_type?.startsWith(typeFilter));
    }

    // Date Filter
    if (dateFilter !== "all") {
      const now = new Date();
      result = result.filter((f) => {
        const fileDate = new Date(f.created_at);
        const diffTime = Math.abs(now.getTime() - fileDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (dateFilter === "today") return diffDays <= 1;
        if (dateFilter === "week") return diffDays <= 7;
        if (dateFilter === "month") return diffDays <= 30;
        return true;
      });
    }

    // Size Filter
    if (sizeFilter !== "all") {
      result = result.filter((f) => {
        const sizeMB = f.size / (1024 * 1024);
        if (sizeFilter === "small") return sizeMB < 1; // < 1MB
        if (sizeFilter === "medium") return sizeMB >= 1 && sizeMB < 10; // 1-10MB
        if (sizeFilter === "large") return sizeMB >= 10; // > 10MB
        return true;
      });
    }

    setFilteredFiles(result);
  };

  const deleteFile = async (file: FileItem) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus "${file.name}"?`)) return;
    
    const toastId = toast.loading("Menghapus berkas...");

    try {
      // 1. Delete from ImageKit if possible (via backend function)
      if (file.file_id && file.storage_account_id) {
         try {
             await api.functions.invoke('imagekit-delete', {
                body: { 
                    fileId: file.file_id, 
                    storageAccountId: file.storage_account_id 
                }
             });
         } catch (fnError) {
             console.error("ImageKit delete error:", fnError);
             throw new Error("Gagal menghapus dari penyimpanan cloud (ImageKit).");
         }
      }

      // 2. Delete from Database
      await api.files.delete(file.id);
      
      toast.success("Berkas berhasil dihapus", { id: toastId });
      setFiles(files.filter((f) => f.id !== file.id));
    } catch (error: any) {
      toast.error(`Gagal: ${error.message}`, { id: toastId });
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link CDN disalin ke clipboard");
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isImageFile = (file: FileItem) => {
    return (
      file.url.includes("ik.imagekit.io") ||
      (file.file_type && file.file_type.startsWith("image")) ||
      /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(file.name) ||
      /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(file.url)
    );
  };

  const isVideoFile = (file: FileItem) => {
    return (
      (file.file_type && file.file_type.startsWith("video")) ||
      /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(file.name) ||
      /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(file.url)
    );
  };

  const getFileIcon = (file: FileItem) => {
    if (isImageFile(file)) return Image;
    if (isVideoFile(file)) return Video;
    return FileText;
  };

  return (
    <div className="space-y-6 animate-fade-in bg-slate-950 text-blue-100 min-h-screen p-6 rounded-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
            Kelola Berkas
          </h1>
          <p className="text-slate-400">Kelola berkas yang telah diunggah</p>
        </div>
        
        <div className="flex gap-2">
          {/* Action buttons removed as requested - list view only */}
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Cari berkas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-full md:w-40 bg-slate-800/50 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                <SelectValue placeholder="Akun Penyimpanan" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                <SelectItem value="all">Semua Akun</SelectItem>
                {storageAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40 bg-slate-800/50 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                <SelectValue placeholder="Tipe Berkas" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="image">Gambar</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="application">Dokumen</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-40 bg-slate-800/50 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                <SelectValue placeholder="Tanggal" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                <SelectItem value="all">Semua Waktu</SelectItem>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="week">7 Hari Terakhir</SelectItem>
                <SelectItem value="month">30 Hari Terakhir</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger className="w-full md:w-40 bg-slate-800/50 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                <SelectValue placeholder="Ukuran" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                <SelectItem value="all">Semua Ukuran</SelectItem>
                <SelectItem value="small">Kecil (&lt;1MB)</SelectItem>
                <SelectItem value="medium">Sedang (1-10MB)</SelectItem>
                <SelectItem value="large">Besar (&gt;10MB)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0" : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0" : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-500">Memuat berkas...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileIcon className="h-16 w-16 text-slate-700 mb-4" />
            <p className="mt-4 text-xl font-medium text-slate-300">Tidak ada berkas ditemukan</p>
            <p className="text-slate-500">Unggah beberapa berkas untuk memulai</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file);
            return (
              <Card key={file.id} className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:bg-slate-800/80 transition-all duration-300 group overflow-hidden">
                <CardContent className="p-4">
                  <div className="aspect-square rounded-lg bg-slate-950/50 flex items-center justify-center mb-3 relative overflow-hidden border border-slate-800/50">
                    {isImageFile(file) ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover rounded-lg transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <Icon className="h-12 w-12 text-blue-400 group-hover:text-cyan-400 transition-colors" />
                    )}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                      <Button size="icon" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0" onClick={() => setSelectedFile(file)} title="Pratinjau">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0" onClick={() => copyToClipboard(file.url)} title="Salin Link CDN">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0" asChild title="Unduh">
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button size="icon" variant="destructive" className="bg-red-500/20 hover:bg-red-500/40 text-red-400 border-0" onClick={() => deleteFile(file)} title="Hapus">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="font-medium truncate text-slate-300 group-hover:text-blue-300 transition-colors">{file.name}</p>
                  <p className="text-sm text-slate-500">{formatBytes(file.size)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-800">
              {filteredFiles.map((file) => {
                const Icon = getFileIcon(file);
                return (
                  <div key={file.id} className="flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-slate-950/50 flex items-center justify-center border border-slate-800">
                        <Icon className="h-5 w-5 text-blue-400 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-300 group-hover:text-blue-300 transition-colors">{file.name}</p>
                        <p className="text-sm text-slate-500">
                          {formatBytes(file.size)} • {new Date(file.created_at).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => setSelectedFile(file)} title="Pratinjau">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => copyToClipboard(file.url)} title="Salin Link CDN">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800" asChild title="Unduh">
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => deleteFile(file)} title="Hapus">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 p-0 overflow-hidden text-slate-200" aria-describedby="preview-description">
          <DialogHeader className="p-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10 flex flex-row items-center justify-between">
            <DialogTitle className="truncate pr-8 text-slate-200">{selectedFile?.name || "Pratinjau Berkas"}</DialogTitle>
            <DialogDescription id="preview-description" className="sr-only">
              Pratinjau untuk berkas {selectedFile?.name}
            </DialogDescription>
            <Button size="sm" variant="outline" className="mr-8 bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => selectedFile && copyToClipboard(selectedFile.url)}>
              <Copy className="mr-2 h-4 w-4" />
              Salin Link CDN
            </Button>
          </DialogHeader>
          <div className="flex items-center justify-center bg-black/40 min-h-[400px] max-h-[80vh] pt-16 pb-4 px-4 overflow-auto">
            {selectedFile && (
               (() => {
                  const isImage = isImageFile(selectedFile);
                  const isVideo = isVideoFile(selectedFile);

                  if (isImage) {
                    return (
                        <img 
                            src={selectedFile.url} 
                            alt={selectedFile.name} 
                            className="max-w-full max-h-[70vh] object-contain rounded-md shadow-2xl" 
                        />
                    );
                  } else if (isVideo) {
                    return (
                        <video 
                            src={selectedFile.url} 
                            controls 
                            className="max-w-full max-h-[70vh] rounded-md shadow-2xl" 
                        >
                            Browser Anda tidak mendukung tag video.
                        </video>
                    );
                  } else {
                    return (
                        <div className="flex flex-col items-center justify-center text-center p-8">
                            <FileIcon className="h-24 w-24 text-slate-700 mb-4 opacity-50" />
                            <p className="text-lg font-medium mb-2 text-slate-300">Pratinjau tidak tersedia</p>
                            <p className="text-sm text-slate-500 mb-6">
                                Tipe berkas ini tidak dapat dipratinjau secara langsung.
                            </p>
                            <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white" asChild>
                                <a href={selectedFile.url} target="_blank" rel="noopener noreferrer">
                                    <Download className="mr-2 h-4 w-4" />
                                    Unduh / Buka di Tab Baru
                                </a>
                            </Button>
                        </div>
                    );
                  }
               })()
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
