import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, CloudUpload, FileIcon, X, CheckCircle, AlertCircle, Settings, Play, Pause, RefreshCw, Image as ImageIcon, Loader2, Edit2, Copy, ExternalLink, Cloud, FileJson, FileSpreadsheet, Link } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { api } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { upload } from "@imagekit/javascript";

// Security: Allowed file types and size limits
const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
  "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska",
  "audio/mpeg", "audio/wav"
];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_FILENAME_LENGTH = 255;

interface StorageAccount {
  id: string;
  name: string;
  is_active: boolean;
  public_key?: string;
  url_endpoint?: string;
  provider?: "imagekit" | "cloudinary";
}

interface QueueItem {
  id: string;
  file?: File; // Optional now, as we might have sourceUrl
  sourceUrl?: string; // New field for URL uploads
  processedFile?: File;
  status: "pending" | "compressing" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  url?: string;
  fileId?: string;
  originalSize: number;
  finalSize?: number;
  fileType?: string;
  customName?: string;
  compressionSettings?: CompressionSettings;
  videoSettings?: VideoSettings;
}

interface CompressionSettings {
  enabled: boolean;
  format: "original" | "webp" | "jpeg" | "png";
  quality: number; // 0-100
}

interface VideoSettings {
  enabled: boolean;
  format: "original" | "mp4" | "webm";
  quality: "auto" | "high" | "medium" | "low";
}

// Helper to determine MIME type from filename
function getMimeType(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav'
  };
  
  return mimeTypes[ext] || null;
}

function resolveFileName(originalName: string, customName?: string): string {
  const originalExt = originalName.split('.').pop();
  if (!customName || customName.trim() === "") return originalName;
  if (!originalExt) return customName;
  return customName.endsWith('.' + originalExt) ? customName : `${customName}.${originalExt}`;
}

// Validate file before adding to queue
function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `Tipe berkas "${file.type}" tidak diizinkan` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `Berkas terlalu besar (maks ${MAX_FILE_SIZE / (1024 * 1024)}MB)` };
  }
  if (file.size === 0) {
    return { valid: false, error: "Berkas kosong" };
  }
  return { valid: true };
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export default function UploadCenter() {
  const [accounts, setAccounts] = useState<StorageAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [currentAccount, setCurrentAccount] = useState<StorageAccount | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingItem, setEditingItem] = useState<QueueItem | null>(null);
  const [exhaustedAccounts, setExhaustedAccounts] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Default Settings (User can change these as "Templates")
  const [defaultSettings, setDefaultSettings] = useState<CompressionSettings>({
    enabled: false,
    format: "original",
    quality: 80,
  });

  const [defaultVideoSettings, setDefaultVideoSettings] = useState<VideoSettings>({
    enabled: false,
    format: "original",
    quality: "auto",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importBatchRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchAccounts();
    fetchCategories();
  }, [user]);

  useEffect(() => {
    if (selectedAccount && accounts.length > 0) {
      const account = accounts.find(a => a.id === selectedAccount) || null;
      setCurrentAccount(account);
    }
  }, [selectedAccount, accounts]);

  // Queue Processor
  useEffect(() => {
    const isBusy = queue.some(item => item.status === "compressing" || item.status === "uploading");
    const hasPending = queue.some(item => item.status === "pending");

    if (isProcessing && hasPending && !isBusy) {
      processNextItem();
    } else if (isProcessing && !hasPending && !isBusy) {
      setIsProcessing(false);
      toast.success("Semua antrian selesai diproses!");
    }
  }, [queue, isProcessing]);

  const fetchAccounts = async () => {
    if (!user) return;

    try {
      const response = await api.storageCredentials.list();
      // Filter active accounts
      const activeAccounts = response.data.filter((acc: StorageAccount) => acc.is_active);
      setAccounts(activeAccounts);
      if (activeAccounts.length > 0) {
        setSelectedAccount(activeAccounts[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch accounts", error);
    }
  };

  const fetchCategories = async () => {
    if (!user) return;
    try {
      const response = await api.categories.list();
      setCategories(response.data || []);
      if (response.data?.length > 0 && !selectedCategory) {
        // keep empty default (no category) unless user selects
      }
    } catch (error) {
      console.error("Failed to fetch categories", error);
    }
  };

  const compressImage = async (file: File, settings: CompressionSettings): Promise<File> => {
    if (!settings.enabled || !file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
      return file;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        let targetType = file.type;
          if (settings.format !== 'original') {
            targetType = `image/${settings.format}`;
          }
          
          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + (settings.format !== 'original' ? `.${settings.format}` : `.${file.name.split('.').pop()}`), {
                type: targetType,
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              reject(new Error("Canvas to Blob failed"));
            }
          }, targetType, settings.quality / 100);
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Failed to load image"));
        };
        
        img.src = url;
      });
    };

  // Process next item in queue
  const processNextItem = async () => {
    // Find next pending item
    const nextItem = queue.find(item => item.status === "pending");
    if (!nextItem) return;

    // Use item-specific settings or fall back to defaults (though they should be set on creation)
    const itemCompressionSettings = nextItem.compressionSettings || defaultSettings;
    const itemVideoSettings = nextItem.videoSettings || defaultVideoSettings;

    // Mark as compressing
    setQueue(prev => prev.map(item => 
      item.id === nextItem.id ? { ...item, status: "compressing", progress: 0 } : item
    ));

    try {
      let fileToUpload: File | string | undefined = nextItem.file;
      let isUrlUpload = !!nextItem.sourceUrl;
      let fileSize = nextItem.originalSize;
      let fileType = nextItem.fileType || nextItem.file?.type || "application/octet-stream";

      if (isUrlUpload && nextItem.sourceUrl) {
        fileToUpload = nextItem.sourceUrl;
        // Skip compression for URL uploads for now
        setQueue(prev => prev.map(item => 
            item.id === nextItem.id ? { ...item, progress: 50, status: "uploading" } : item
        ));
      } else if (nextItem.file) {
          // 1. Compress Image / Prepare Video
          // Simulate progress for compression step
          setQueue(prev => prev.map(item => 
            item.id === nextItem.id ? { ...item, progress: 30 } : item
          ));

          if (nextItem.file.type.startsWith('image/')) {
             try {
               const compressed = await compressImage(nextItem.file, itemCompressionSettings);
               fileToUpload = compressed;
               fileSize = compressed.size;
             } catch (error) {
               console.error("Compression failed, using original file", error);
             }
          }
          
          setQueue(prev => prev.map(item => 
            item.id === nextItem.id ? { ...item, processedFile: fileToUpload as File, progress: 50, status: "uploading" } : item
          ));
      } else {
          throw new Error("Invalid queue item: no file or source URL");
      }

      // 2. Upload (ImageKit or Cloudinary)
      const storageAccount = accounts.find(acc => acc.id === selectedAccount);
      if (!storageAccount) {
        throw new Error("No active storage account found");
      }
      
      // Determine file name
      let fileNameToUse = nextItem.customName || (nextItem.file ? nextItem.file.name : "upload_from_url");
      if (isUrlUpload && nextItem.sourceUrl && !nextItem.customName) {
          // Try to extract filename from URL
          const urlParts = nextItem.sourceUrl.split('/');
          const lastPart = urlParts[urlParts.length - 1];
          fileNameToUse = lastPart.split('?')[0] || "upload_from_url";
      }

      if (nextItem.customName) {
          const originalExt = fileNameToUse.split('.').pop();
          // If custom name doesn't have extension, try to keep original
          if (originalExt && !originalExt.includes('/')) {
              // It has extension
          } else {
             // Try to append extension from original file or URL
             // ... simplified for now
          }
      }
      
      let finalUrl = "";
      let uploadedFileId = "";

      if (storageAccount.provider === 'cloudinary') {
        // --- Cloudinary Upload Flow ---
        
        // 1. Get Signature
        const signResponse = await api.functions.invoke('cloudinary-sign', {
            body: { 
                storageAccountId: storageAccount.id,
                params: {
                   public_id: fileNameToUse.split('.')[0], // Cloudinary prefers public_id without extension
                   folder: "uploads",
                }
            }
        });
        const { signature, timestamp, cloudName, apiKey } = signResponse.data;
        if (!cloudName || !/^[a-z0-9_-]+$/.test(cloudName)) {
          throw new Error("Cloudinary cloud name tidak valid. Perbarui di Akun Penyimpanan.");
        }
        
        // 2. Upload to Cloudinary
        const formData = new FormData();
        formData.append("file", fileToUpload as string | Blob); // Works for both File (Blob) and URL (string)
        formData.append("api_key", apiKey);
        formData.append("timestamp", timestamp.toString());
        formData.append("signature", signature);
        formData.append("folder", "uploads");
        formData.append("public_id", fileNameToUse.split('.')[0]); 
        
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { // Use 'auto' for resource type
            method: "POST",
            body: formData
        });
        
        if (!uploadRes.ok) {
            const err = await uploadRes.json();
            const msg = (err.error?.message || "Cloudinary upload failed") as string;
            if (msg.toLowerCase().includes("invalid cloud_name")) {
              throw new Error("Cloud Name Cloudinary salah. Buka Akun Penyimpanan dan perbarui Cloud Name persis seperti di dashboard.");
            }
            throw new Error(msg);
        }
        
        const uploadData = await uploadRes.json();
        finalUrl = uploadData.secure_url;
        uploadedFileId = uploadData.public_id;
        fileSize = uploadData.bytes; // Update size from response
        fileType = `${uploadData.resource_type}/${uploadData.format}`;
        
      } else {
        // --- ImageKit Upload Flow ---
        
        let authData;
        try {
          const response = await api.functions.invoke('imagekit-upload', {
              body: { 
                  fileName: fileNameToUse, 
                  storageAccountId: storageAccount.id,
              }
          });
          authData = response.data;
        } catch (err: any) {
          throw new Error(err.response?.data?.error || err.message || "Gagal mendapatkan izin upload");
        }
        
        const uploadResult = await upload({
          file: fileToUpload as string | File,
          fileName: fileNameToUse,
          token: authData.token,
          signature: authData.signature,
          expire: authData.expire,
          publicKey: authData.publicKey ?? storageAccount.public_key ?? "",
          useUniqueFileName: true,
          folder: "/uploads",
        });
        
        finalUrl = uploadResult.url;
        uploadedFileId = uploadResult.fileId;
        fileSize = uploadResult.size;
        
        // Video transformations for ImageKit
        if (fileType.startsWith('video/') && itemVideoSettings.enabled) {
          // ... (keep existing transformation logic)
          const transformations = [];
          if (itemVideoSettings.format !== 'original') {
            transformations.push(`f-${itemVideoSettings.format}`);
          }
          if (itemVideoSettings.quality !== 'auto') {
             const qualityMap = { high: 80, medium: 60, low: 40 };
             if (itemVideoSettings.quality in qualityMap) {
                transformations.push(`q-${qualityMap[itemVideoSettings.quality as keyof typeof qualityMap]}`);
             }
          }
          
          if (transformations.length > 0) {
            const separator = finalUrl.includes('?') ? '&' : '?';
            finalUrl = `${finalUrl}${separator}tr=${transformations.join(',')}`;
          }
        }
      }

      setQueue(prev => prev.map(item => 
        item.id === nextItem.id 
          ? { 
              ...item, 
              status: "success", 
              progress: 100, 
              url: finalUrl,
              fileId: uploadedFileId,
              finalSize: fileSize 
            } 
          : item
      ));

      // Save to Database
      await api.files.create({
        name: fileNameToUse,
        size: fileSize,
        file_type: fileType,
        storage_account_id: storageAccount.id,
        url: finalUrl,
        file_id: uploadedFileId,
        category_ids: selectedCategory ? [selectedCategory] : undefined
      });

    } catch (error: any) {
      console.error("Upload failed", error);
      const errorMessage = error.message || "Upload failed";
      const lowerMsg = errorMessage.toLowerCase();
      if (lowerMsg.includes("invalid cloud_name") || lowerMsg.includes("cloud name")) {
        toast.error("Cloud Name Cloudinary tidak valid. Perbarui di Akun Penyimpanan.");
      }
      
      // Auto-switch account logic
      // Check for common quota/limit errors (add more as discovered)
      const isQuotaError = 
        errorMessage.toLowerCase().includes("limit") || 
        errorMessage.toLowerCase().includes("quota") ||
        errorMessage.toLowerCase().includes("exceeded") ||
        errorMessage.toLowerCase().includes("full") ||
        errorMessage.toLowerCase().includes("capacity") ||
        errorMessage.toLowerCase().includes("credit");

      if (isQuotaError) {
        toast.warning(`Akun ${storageAccount?.name} mencapai batas/error. Mencoba beralih akun...`);
        
        setExhaustedAccounts(prev => {
          const newSet = new Set(prev);
          if (storageAccount) newSet.add(storageAccount.id);
          return newSet;
        });

        // Find next available account with SAME PROVIDER
        const currentProvider = storageAccount?.provider;
        const nextAccount = accounts.find(acc => 
          acc.provider === currentProvider && 
          acc.id !== storageAccount?.id && 
          !exhaustedAccounts.has(acc.id) &&
          acc.is_active
        );

        if (nextAccount) {
          setSelectedAccount(nextAccount.id);
          toast.info(`Beralih ke akun: ${nextAccount.name}`);
          
          // Move item to END of queue to retry later
          setQueue(prev => {
            const newQueue = prev.filter(item => item.id !== nextItem.id);
            // Reset status to pending so it gets picked up again
            const resetItem = { ...nextItem, status: "pending" as const, progress: 0 };
            return [...newQueue, resetItem];
          });
          
          return; // Exit, effect will trigger next processing
        } else {
           toast.error("Tidak ada akun cadangan yang tersedia untuk penyedia ini.");
        }
      }

      // If not quota error OR no backup account found, move to end as error/pending?
      // User said: "error itu pindahkan ke id paling akhir supaya upload lagi tidak melewati yang error itu"
      // So regardless of error type, move to end.
      
      setQueue(prev => {
         const newQueue = prev.filter(item => item.id !== nextItem.id);
         const failedItem = { 
            ...nextItem, 
            status: "error" as const, // Keep as error so it doesn't infinite loop if no intervention
            error: errorMessage, 
            progress: 0 
         };
         return [...newQueue, failedItem];
      });

      toast.error(`Gagal mengunggah ${nextItem.customName || "berkas"}: ${errorMessage}. Item dipindahkan ke akhir antrian.`);
    }
  };

  const updateQueueItem = (id: string, updates: Partial<QueueItem>) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    setEditingItem(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  };

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => {
        const validation = validateFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          return null;
        }
        return {
          id: Math.random().toString(36).substring(7),
          file,
          status: "pending",
          progress: 0,
          originalSize: file.size,
          customName: file.name,
          compressionSettings: { ...defaultSettings },
          videoSettings: { ...defaultVideoSettings }
        } as QueueItem;
      }).filter(Boolean) as QueueItem[];

      if (newFiles.length > 0) {
        setQueue(prev => [...prev, ...newFiles]);
        // Auto open modal for the first file if it's pending
        setEditingItem(newFiles[0]);
      }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeQueueItem = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 bg-slate-950 text-blue-100 min-h-screen p-6 rounded-xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">Pusat Unggah Modern</h1>
          <p className="text-slate-400">Unggah, kompres, dan konversi berkas Anda secara otomatis</p>
        </div>
        
        {/* Account Selection & Import */}
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          {/* Removed Import Batch as requested - Upload Center is for files */}
          
          {accounts.length === 0 ? (
            <Button variant="outline" asChild className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
                <a href="/storage-accounts">Tambah Akun Penyimpanan</a>
            </Button>
          ) : (
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-full md:w-[250px] bg-slate-800/50 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                <SelectValue placeholder="Pilih akun" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id} disabled={exhaustedAccounts.has(account.id)}>
                    <div className="flex items-center gap-2">
                       {account.provider === 'cloudinary' ? <Cloud className="w-3 h-3 text-blue-400" /> : <ImageIcon className="w-3 h-3 text-cyan-400" />}
                       <span className={exhaustedAccounts.has(account.id) ? "line-through text-slate-500" : ""}>{account.name}</span>
                       {exhaustedAccounts.has(account.id) && <span className="text-xs text-red-500 ml-1">(Limit)</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Category Selection */}
          <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v === "none" ? "" : v)}>
            <SelectTrigger className="w-full md:w-[220px] bg-slate-800/50 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
              <SelectValue placeholder="Kategori (opsional)" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
              <SelectItem value="none">Tanpa Kategori</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span>{cat.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        {/* Upload & Queue Area */}
        <div className="space-y-6">
          {/* Drop Zone */}
          <Card className={`bg-slate-900/50 border-dashed border-2 border-slate-700 transition-all duration-300 ${!currentAccount ? 'opacity-50 pointer-events-none' : 'hover:border-blue-500 hover:bg-slate-800/50'}`}>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFilesSelect}
                accept={ALLOWED_MIME_TYPES.join(',')}
              />
              <div className="h-20 w-20 rounded-full bg-blue-900/20 flex items-center justify-center mb-4 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)] group-hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-shadow">
                <CloudUpload className="h-10 w-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-200">Klik untuk Memilih Berkas</h3>
              <p className="text-sm text-slate-400 mb-6 max-w-sm">
                Mendukung banyak berkas sekaligus. Gambar, Video, Dokumen.
              </p>
              <Button variant="secondary" className="bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/30">Pilih Berkas</Button>
            </CardContent>
          </Card>

          {/* Queue Actions */}
          {queue.length > 0 && (
            <div className="flex items-center justify-between bg-slate-900/80 p-4 rounded-lg border border-slate-800 shadow-lg">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-slate-800/50 border-slate-700 text-slate-300">
                  {queue.filter(i => i.status === "success").length} / {queue.length} Selesai
                </Badge>
                {isProcessing && <Badge className="bg-blue-600/20 text-blue-400 border border-blue-500/30 animate-pulse">Sedang Memproses...</Badge>}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setQueue([])} 
                  disabled={isProcessing}
                  className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800 transition-colors"
                >
                  <X className="mr-2 h-4 w-4" />
                  Bersihkan
                </Button>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 shadow-lg shadow-blue-900/20" 
                  onClick={() => setIsProcessing(!isProcessing)}
                  disabled={!queue.some(i => i.status === "pending" || i.status === "error")}
                >
                  {isProcessing ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" /> Jeda
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" /> Mulai Unggah
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Queue List */}
          {queue.length > 0 && (
            <ScrollArea className="h-[400px] rounded-lg border border-slate-800 bg-slate-900/50 p-4 shadow-inner">
              <div className="space-y-3">
                {queue.map((item) => (
                  <div key={item.id} className="group flex items-center gap-4 p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/60 transition-colors border border-slate-800 hover:border-slate-700">
                    <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800">
                      {item.sourceUrl ? (
                         <Link className="h-5 w-5 text-green-400" />
                      ) : item.file?.type.startsWith('image') ? (
                         <ImageIcon className="h-5 w-5 text-blue-400" />
                      ) : (
                         <FileIcon className="h-5 w-5 text-orange-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm text-slate-200" title={item.customName || item.file?.name || item.sourceUrl}>
                              {item.customName !== undefined ? item.customName : (item.file?.name || "Remote File")}
                          </p>
                          {item.sourceUrl && <p className="text-[10px] text-slate-500 truncate">{item.sourceUrl}</p>}
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap mt-1">
                          {formatBytes(item.processedFile ? item.finalSize! : item.originalSize)}
                          {item.processedFile && <span className="text-green-400 ml-1">(-{Math.round((1 - item.finalSize!/item.originalSize)*100)}%)</span>}
                        </span>
                      </div>
                      
                      {item.status === "pending" && <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-slate-700 w-0" /></div>}
                      {(item.status === "compressing" || item.status === "uploading") && (
                        <div className="space-y-1">
                          <Progress value={item.progress} className="h-1.5 bg-slate-800" indicatorClassName="bg-blue-500" />
                          <p className="text-[10px] text-blue-400 flex items-center">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            {item.status === "compressing" ? "Mengompresi..." : "Mengunggah ke CDN..."}
                          </p>
                        </div>
                      )}
                      {item.status === "success" && (
                         <div className="flex flex-col gap-1 mt-1">
                           <div className="flex items-center text-xs text-green-400">
                             <CheckCircle className="h-3 w-3 mr-1" /> Berhasil
                           </div>
                           {item.url && (
                             <div className="flex items-center gap-2 mt-1">
                               <div className="relative group/preview">
                                  {((item.file && item.file.type.startsWith('image')) || (item.fileType?.startsWith('image'))) && (
                                    <div className="h-10 w-10 rounded border border-slate-700 overflow-hidden">
                                      <img src={item.url} alt="Preview" className="h-full w-full object-cover" />
                                    </div>
                                  )}
                               </div>
                               <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 text-xs px-2 bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.url!);
                                      toast.success("Link disalin!");
                                    }}
                                  >
                                    <Copy className="h-3 w-3 mr-1" /> Salin Link
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 text-xs px-2 bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                                    asChild
                                  >
                                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-3 w-3 mr-1" /> Buka
                                    </a>
                                  </Button>
                               </div>
                             </div>
                           )}
                         </div>
                      )}
                      {item.status === "error" && (
                        <div className="flex items-center text-xs text-red-400">
                          <AlertCircle className="h-3 w-3 mr-1" /> {item.error || "Gagal"}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {item.status === "pending" && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setEditingItem(item)}
                          className="text-slate-400 hover:text-white hover:bg-slate-700 opacity-100 transition-all"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-slate-400 hover:text-red-400 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all" 
                        onClick={() => removeQueueItem(item.id)} 
                        disabled={isProcessing && (item.status === "compressing" || item.status === "uploading")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Configuration Modal */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[500px] [&>button]:hidden bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Konfigurasi Berkas</DialogTitle>
            <DialogDescription className="text-slate-400">
              Atur nama dan optimasi untuk berkas ini sebelum diunggah.
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-4">
              {/* File Info */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-950 border border-slate-800">
                 <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800">
                    {editingItem.sourceUrl ? <Link className="h-5 w-5 text-green-400" /> : (editingItem.file?.type.startsWith('image') ? <ImageIcon className="h-5 w-5 text-blue-400" /> : <FileIcon className="h-5 w-5 text-orange-400" />)}
                 </div>
                 <div className="overflow-hidden">
                   <p className="font-medium truncate text-sm text-slate-200">
                     {resolveFileName(editingItem.file?.name || "remote_file", editingItem.customName)}
                   </p>
                   <p className="text-xs text-slate-500">{formatBytes(editingItem.originalSize)}</p>
                 </div>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="filename" className="text-slate-300">Nama Berkas</Label>
                <div className="flex gap-2">
                  <Input 
                    id="filename" 
                    value={editingItem.customName !== undefined ? editingItem.customName : (editingItem.file?.name || "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val.trim()) {
                        const shortName = Math.random().toString(36).substring(2, 7);
                        updateQueueItem(editingItem.id, { customName: shortName });
                      } else {
                        updateQueueItem(editingItem.id, { customName: val });
                      }
                    }}
                    onBlur={(e) => {
                      if (!e.target.value.trim()) {
                        const shortName = Math.random().toString(36).substring(2, 7);
                        updateQueueItem(editingItem.id, { customName: shortName });
                        toast.info("Nama otomatis dibuat (5 karakter)");
                      }
                    }}
                    placeholder="Nama berkas..."
                    className="bg-slate-800 border-slate-700 text-slate-200 focus:border-blue-500"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateQueueItem(editingItem.id, { customName: Math.random().toString(36).substring(2, 7) })}
                    title="Generate Random Short Name"
                    className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-slate-500">Kosongkan untuk membuat nama acak singkat (5 digit) secara otomatis.</p>
                <p className="text-[10px] text-slate-500">
                  Nama yang akan dipakai: <span className="font-medium text-blue-400">{resolveFileName(editingItem.file?.name || "file", editingItem.customName)}</span>
                </p>
              </div>

              {/* Compression Settings (Image) - Only for File objects for now */}
              {editingItem.file && editingItem.file.type.startsWith('image') && editingItem.compressionSettings && (
                <div className="space-y-4 border border-slate-800 rounded-lg p-3 bg-slate-950/30">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-slate-300"><Settings className="w-4 h-4 text-blue-400" /> Optimasi Gambar</Label>
                    <Switch 
                      checked={editingItem.compressionSettings.enabled}
                      onCheckedChange={(checked) => updateQueueItem(editingItem.id, { 
                        compressionSettings: { ...editingItem.compressionSettings!, enabled: checked } 
                      })}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                  
                  {editingItem.compressionSettings.enabled && (
                    <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                       <div className="space-y-2">
                          <Label className="text-xs text-slate-400">Format Output</Label>
                          <Select 
                            value={editingItem.compressionSettings.format} 
                            onValueChange={(val: any) => updateQueueItem(editingItem.id, { 
                              compressionSettings: { ...editingItem.compressionSettings!, format: val } 
                            })}
                          >
                            <SelectTrigger className="h-8 bg-slate-800 border-slate-700 text-slate-200">
                              <SelectValue placeholder="Pilih format" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                              <SelectItem value="original">Asli (Original)</SelectItem>
                              <SelectItem value="webp">WebP (Disarankan)</SelectItem>
                              <SelectItem value="jpeg">JPEG</SelectItem>
                              <SelectItem value="png">PNG</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label className="text-xs text-slate-400">Kualitas: {editingItem.compressionSettings.quality}%</Label>
                          </div>
                          <Slider 
                            value={[editingItem.compressionSettings.quality]} 
                            onValueChange={(val) => updateQueueItem(editingItem.id, { 
                              compressionSettings: { ...editingItem.compressionSettings!, quality: val[0] } 
                            })}
                            max={100}
                            step={5}
                            className="py-2"
                          />
                        </div>
                    </div>
                  )}
                </div>
              )}

              {/* Video Settings */}
              {((editingItem.file && editingItem.file.type.startsWith('video')) || (editingItem.fileType?.startsWith('video'))) && editingItem.videoSettings && (
                <div className="space-y-4 border border-slate-800 rounded-lg p-3 bg-slate-950/30">
                  <div className="flex items-center justify-between">
                     <Label className="flex items-center gap-2 text-slate-300"><Settings className="w-4 h-4 text-purple-400" /> Optimasi Video</Label>
                     <Switch 
                        checked={editingItem.videoSettings.enabled}
                        onCheckedChange={(checked) => updateQueueItem(editingItem.id, { 
                          videoSettings: { ...editingItem.videoSettings!, enabled: checked } 
                        })}
                        className="data-[state=checked]:bg-purple-600"
                      />
                  </div>

                  {editingItem.videoSettings.enabled && (
                    <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                       <div className="space-y-2">
                          <Label className="text-xs text-slate-400">Format</Label>
                          <Select 
                            value={editingItem.videoSettings.format} 
                            onValueChange={(val: any) => updateQueueItem(editingItem.id, { 
                              videoSettings: { ...editingItem.videoSettings!, format: val } 
                            })}
                          >
                            <SelectTrigger className="h-8 bg-slate-800 border-slate-700 text-slate-200">
                              <SelectValue placeholder="Pilih format" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                              <SelectItem value="original">Asli</SelectItem>
                              <SelectItem value="mp4">MP4</SelectItem>
                              <SelectItem value="webm">WebM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-400">Kualitas</Label>
                          <Select 
                            value={editingItem.videoSettings.quality} 
                            onValueChange={(val: any) => updateQueueItem(editingItem.id, { 
                              videoSettings: { ...editingItem.videoSettings!, quality: val } 
                            })}
                          >
                            <SelectTrigger className="h-8 bg-slate-800 border-slate-700 text-slate-200">
                              <SelectValue placeholder="Pilih kualitas" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                              <SelectItem value="auto">Otomatis</SelectItem>
                              <SelectItem value="high">Tinggi</SelectItem>
                              <SelectItem value="medium">Sedang</SelectItem>
                              <SelectItem value="low">Rendah</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setEditingItem(null)} className="bg-blue-600 hover:bg-blue-700 text-white">Selesai</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
