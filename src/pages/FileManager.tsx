import { useState, useEffect, useRef } from "react";
import { Search, Grid, List, FileIcon, Image, Video, FileText, Trash2, Download, Eye, Copy, Filter, Upload, FileJson, FileSpreadsheet, Tags } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { api } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

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

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function FileManager() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [storageAccounts, setStorageAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categoryDialogFile, setCategoryDialogFile] = useState<FileItem | null>(null);
  const [selectedCategoriesForFile, setSelectedCategoriesForFile] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!user) return;
    fetchFiles();
    fetchStorageAccounts();
    fetchCategories();
    // Realtime subscription removed in SQLite migration
  }, [user]);

  useEffect(() => {
    const initialCategoryId = searchParams.get("category_id");
    if (initialCategoryId) {
      setCategoryFilter(initialCategoryId);
    }
  }, []);

  useEffect(() => {
    filterFiles();
  }, [files, searchQuery, typeFilter, dateFilter, sizeFilter, accountFilter]);

  useEffect(() => {
    if (!user) return;
    fetchFiles();
    if (categoryFilter === "all") {
      searchParams.delete("category_id");
      setSearchParams(searchParams, { replace: true });
    } else {
      searchParams.set("category_id", categoryFilter);
      setSearchParams(searchParams, { replace: true });
    }
  }, [categoryFilter]);

  const fetchFiles = async () => {
    if (!user) return;
    try {
      const params = categoryFilter !== "all" ? { category_id: categoryFilter } : undefined;
      const response = await api.files.list(params);
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

  const fetchCategories = async () => {
    try {
      const response = await api.categories.list();
      setCategories(response.data || []);
    } catch (error) {
      console.error("Gagal mengambil kategori", error);
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

  const openCategoryDialog = async (file: FileItem) => {
    setCategoryDialogFile(file);
    setIsCategoryDialogOpen(true);
    try {
      const response = await api.files.getCategories(file.id);
      const assigned: Category[] = response.data || [];
      setSelectedCategoriesForFile(new Set(assigned.map(c => c.id)));
    } catch (error) {
      console.error("Gagal mengambil kategori file", error);
      setSelectedCategoriesForFile(new Set());
    }
  };

  const saveCategoriesForFile = async () => {
    if (!categoryDialogFile) return;
    if (selectedCategoriesForFile.size === 0) {
      toast.error("Pilih minimal satu kategori");
      return;
    }
    try {
      await api.files.setCategories(categoryDialogFile.id, Array.from(selectedCategoriesForFile));
      toast.success("Kategori diperbarui");
      setIsCategoryDialogOpen(false);
      setCategoryDialogFile(null);
      setSelectedCategoriesForFile(new Set());
      // Refresh files to reflect any changes
      fetchFiles();
    } catch (error) {
      toast.error("Gagal menyimpan kategori");
    }
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 bg-slate-900 border-slate-700 text-slate-200 max-h-[75vh] overflow-y-auto">
                <DropdownMenuLabel>Akun</DropdownMenuLabel>
                <ScrollArea className="h-28">
                  <div>
                    <DropdownMenuItem onClick={() => setAccountFilter("all")}>Semua Akun</DropdownMenuItem>
                    {storageAccounts.map((account) => (
                      <DropdownMenuItem key={account.id} onClick={() => setAccountFilter(account.id)}>
                        {account.name}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </ScrollArea>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Tipe</DropdownMenuLabel>
                <div className="grid grid-cols-3 gap-2 px-2 py-1">
                  <Button size="sm" variant={typeFilter === "all" ? "default" : "outline"} onClick={() => setTypeFilter("all")} className="bg-slate-800/50 border-slate-700">Semua</Button>
                  <Button size="sm" variant={typeFilter === "image" ? "default" : "outline"} onClick={() => setTypeFilter("image")} className="bg-slate-800/50 border-slate-700">Gambar</Button>
                  <Button size="sm" variant={typeFilter === "video" ? "default" : "outline"} onClick={() => setTypeFilter("video")} className="bg-slate-800/50 border-slate-700">Video</Button>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Waktu</DropdownMenuLabel>
                <div className="grid grid-cols-4 gap-2 px-2 py-1">
                  <Button size="sm" variant={dateFilter === "all" ? "default" : "outline"} onClick={() => setDateFilter("all")} className="bg-slate-800/50 border-slate-700">Semua</Button>
                  <Button size="sm" variant={dateFilter === "today" ? "default" : "outline"} onClick={() => setDateFilter("today")} className="bg-slate-800/50 border-slate-700">Hari Ini</Button>
                  <Button size="sm" variant={dateFilter === "week" ? "default" : "outline"} onClick={() => setDateFilter("week")} className="bg-slate-800/50 border-slate-700">7 Hari</Button>
                  <Button size="sm" variant={dateFilter === "month" ? "default" : "outline"} onClick={() => setDateFilter("month")} className="bg-slate-800/50 border-slate-700">30 Hari</Button>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Ukuran</DropdownMenuLabel>
                <div className="grid grid-cols-4 gap-2 px-2 py-1">
                  <Button size="sm" variant={sizeFilter === "all" ? "default" : "outline"} onClick={() => setSizeFilter("all")} className="bg-slate-800/50 border-slate-700">Semua</Button>
                  <Button size="sm" variant={sizeFilter === "small" ? "default" : "outline"} onClick={() => setSizeFilter("small")} className="bg-slate-800/50 border-slate-700">Kecil</Button>
                  <Button size="sm" variant={sizeFilter === "medium" ? "default" : "outline"} onClick={() => setSizeFilter("medium")} className="bg-slate-800/50 border-slate-700">Sedang</Button>
                  <Button size="sm" variant={sizeFilter === "large" ? "default" : "outline"} onClick={() => setSizeFilter("large")} className="bg-slate-800/50 border-slate-700">Besar</Button>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Kategori</DropdownMenuLabel>
                <ScrollArea className="h-32">
                  <div className="px-2 py-1 space-y-1">
                    <Button size="sm" variant={categoryFilter === "all" ? "default" : "outline"} onClick={() => setCategoryFilter("all")} className="w-full justify-start bg-slate-800/50 border-slate-700">Semua Kategori</Button>
                    {categories.map((cat) => (
                      <Button
                        key={cat.id}
                        size="sm"
                        variant={categoryFilter === cat.id ? "default" : "outline"}
                        onClick={() => setCategoryFilter(cat.id)}
                        className="w-full justify-start bg-slate-800/50 border-slate-700"
                      >
                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { 
                  setAccountFilter("all"); 
                  setTypeFilter("all"); 
                  setDateFilter("all"); 
                  setSizeFilter("all"); 
                  setCategoryFilter("all"); 
                }}>
                  Reset Filter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {storageAccounts.length >= 3 && (
              <Button 
                variant="outline" 
                className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setAccountFilter(storageAccounts[2].id)}
              >
                CDN ID 3
              </Button>
            )}
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file);
            return (
              <Card key={file.id} className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:bg-slate-800/80 transition-all duration-300 group overflow-hidden">
                <CardContent className="p-4">
                  <div className="aspect-square rounded-lg bg-slate-950/50 flex items-center justify-center mb-3 relative overflow-hidden border border-slate-800/50">
                    {file.storage_account_id && (
                      <Badge 
                        variant="outline" 
                        className="absolute top-2 left-2 bg-slate-900/70 border-slate-700 text-slate-200 cursor-pointer"
                        onClick={() => setAccountFilter(file.storage_account_id || "all")}
                      >
                        CDN {file.storage_account_id.slice(0, 3)}
                      </Badge>
                    )}
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
                      <Button size="icon" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0" onClick={() => openCategoryDialog(file)} title="Atur Kategori">
                        <Tags className="h-4 w-4" />
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
      )}

      {/* Category Assign Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => { if (!open) { setIsCategoryDialogOpen(false); setCategoryDialogFile(null); setSelectedCategoriesForFile(new Set()); } }}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle>Atur Kategori</DialogTitle>
            <DialogDescription>Pilih kategori untuk berkas ini</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-slate-500">Belum ada kategori. Buat di halaman Kategori.</p>
            ) : (
              categories.map((cat) => {
                const checked = selectedCategoriesForFile.has(cat.id);
                return (
                  <label key={cat.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-800/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedCategoriesForFile((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(cat.id);
                          else next.delete(cat.id);
                          return next;
                        });
                      }}
                    />
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span>{cat.name}</span>
                  </label>
                );
              })
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Batal</Button>
            <Button onClick={saveCategoriesForFile} className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0">Simpan</Button>
          </div>
        </DialogContent>
      </Dialog>

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
