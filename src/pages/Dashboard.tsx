import { useEffect, useState } from "react";
import { HardDrive, FileIcon, Database, Upload, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { StorageChart } from "@/components/dashboard/StorageChart";

interface Stats {
  totalFiles: number;
  totalSize: number;
  activeAccounts: number;
}

interface FileItem {
  id: string;
  name: string;
  file_type: string | null;
  created_at: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ totalFiles: 0, totalSize: 0, activeAccounts: 0 });
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch all files
        const { data: files } = await api.files.list();
        
        // Fetch all accounts
        const { data: accounts } = await api.storageCredentials.list();
        const activeAccounts = accounts.filter((a: any) => a.is_active);

        // Recent files (already sorted by server desc)
        setRecentFiles(files.slice(0, 5));

        // Stats
        const totalSize = files.reduce((acc: number, f: any) => acc + (f.size || 0), 0);
        
        setStats({
          totalFiles: files.length,
          totalSize,
          activeAccounts: activeAccounts.length,
        });
      } catch (e) {
        console.error("Failed to fetch dashboard data", e);
      }
      setLoading(false);
    };

    fetchData();
    // Realtime removed
  }, [user]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const statCards = [
    {
      title: "Total Penyimpanan Terpakai",
      value: formatBytes(stats.totalSize),
      icon: HardDrive,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Total Berkas",
      value: stats.totalFiles.toString(),
      icon: FileIcon,
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "Akun Aktif",
      value: stats.activeAccounts.toString(),
      icon: Database,
      color: "from-teal-500 to-green-500",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in bg-slate-950 text-blue-100 min-h-screen p-6 rounded-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
            AI Media Dashboard
          </h1>
          <p className="text-slate-400">Pusat kendali aset media cerdas Anda</p>
        </div>
        <Button onClick={() => navigate("/upload")} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-900/20 transition-all hover:shadow-blue-900/40">
          <Upload className="mr-2 h-4 w-4" />
          Unggah Berkas
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((stat, index) => (
          <Card key={stat.title} className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:bg-slate-900/80 transition-all duration-300 animate-fade-in group" style={{ animationDelay: `${index * 100}ms` }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 group-hover:text-blue-300 transition-colors">
                {stat.title}
              </CardTitle>
              <div className={`rounded-xl bg-gradient-to-br ${stat.color} p-2.5 shadow-lg opacity-80 group-hover:opacity-100 transition-opacity`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white tracking-tight">{loading ? "..." : stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Storage Chart */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
           <CardTitle className="text-slate-200">Analitik Penyimpanan</CardTitle>
           <CardDescription className="text-slate-500">Visualisasi penggunaan storage cloud Anda</CardDescription>
        </CardHeader>
        <CardContent>
           <StorageChart />
        </CardContent>
      </Card>

      {/* Quick Actions & Recent Files */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-200">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              Aksi Cepat
            </CardTitle>
            <CardDescription className="text-slate-500">Tugas umum untuk memulai</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button variant="outline" className="justify-start bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-blue-900/20 hover:text-blue-200 hover:border-blue-800 transition-all" onClick={() => navigate("/upload")}>
              <Upload className="mr-2 h-4 w-4" />
              Unggah Berkas Baru
            </Button>
            <Button variant="outline" className="justify-start bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-blue-900/20 hover:text-blue-200 hover:border-blue-800 transition-all" onClick={() => navigate("/storage-accounts")}>
              <Database className="mr-2 h-4 w-4" />
              Tambah Akun Penyimpanan
            </Button>
            <Button variant="outline" className="justify-start bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-blue-900/20 hover:text-blue-200 hover:border-blue-800 transition-all" onClick={() => navigate("/files")}>
              <FileIcon className="mr-2 h-4 w-4" />
              Jelajahi Manajer Berkas
            </Button>
          </CardContent>
        </Card>

        {/* Recent Files */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-200">
              <Clock className="h-5 w-5 text-purple-400" />
              Unggahan Terbaru
            </CardTitle>
            <CardDescription className="text-slate-500">Berkas yang baru diunggah</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-slate-500">Memuat...</p>
            ) : recentFiles.length === 0 ? (
              <div className="text-center py-8">
                <FileIcon className="mx-auto h-12 w-12 text-slate-700" />
                <p className="mt-2 text-slate-500">Belum ada berkas diunggah</p>
                <Button variant="link" className="text-blue-400 hover:text-blue-300" onClick={() => navigate("/upload")}>
                  Unggah berkas pertama Anda
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentFiles.map((file) => (
                  <li key={file.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-slate-900 text-blue-400">
                         <FileIcon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-slate-300 truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-900/50 px-2 py-1 rounded-full">
                      {new Date(file.created_at).toLocaleDateString("id-ID")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
