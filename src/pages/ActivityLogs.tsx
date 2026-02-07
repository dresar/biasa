import { useState, useEffect } from "react";
import { Activity, Upload, Trash2, Database, FileIcon, Calendar, Filter, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ActivityLog {
  id: string;
  action_type: string;
  details: any;
  created_at: string;
}

const actionIcons: Record<string, any> = {
  file_upload: Upload,
  file_delete: Trash2,
  account_created: Database,
  default: FileIcon,
};

const actionColors: Record<string, string> = {
  file_upload: "bg-green-500/20 text-green-500",
  file_delete: "bg-red-500/20 text-red-500",
  account_created: "bg-blue-500/20 text-blue-500",
  default: "bg-muted text-muted-foreground",
};

const actionLabels: Record<string, string> = {
  file_upload: "Unggah Berkas",
  file_delete: "Hapus Berkas",
  account_created: "Akun Dibuat",
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { user } = useAuth();

  useEffect(() => {
    fetchLogs();
  }, [user, filter]);

  const fetchLogs = async () => {
    if (!user) return;

    try {
      const response = await api.activityLogs.list();
      let data = response.data || [];
      
      if (filter !== "all") {
        data = data.filter((log: ActivityLog) => log.action_type === filter);
      }
      
      setLogs(data);
    } catch (error) {
      toast.error("Gagal mengambil log aktivitas");
    }
    setLoading(false);
  };

  const formatAction = (action: string) => {
    return actionLabels[action] || action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getIcon = (action: string) => {
    return actionIcons[action] || actionIcons.default;
  };

  const getColor = (action: string) => {
    return actionColors[action] || actionColors.default;
  };

  const exportLogs = () => {
    const csv = [
      ["Tanggal", "Aksi", "Detail"],
      ...logs.map((log) => [
        new Date(log.created_at).toISOString(),
        log.action_type,
        JSON.stringify(log.details),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `log-aktivitas-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Log berhasil diekspor");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Log Aktivitas</h1>
          <p className="text-muted-foreground">Lacak semua tindakan di akun Anda</p>
        </div>
        <Button variant="outline" onClick={exportLogs} className="glass">
          <Download className="mr-2 h-4 w-4" />
          Ekspor
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48 glass">
                <SelectValue placeholder="Filter berdasarkan aksi" />
              </SelectTrigger>
              <SelectContent className="glass-strong">
                <SelectItem value="all">Semua Aksi</SelectItem>
                <SelectItem value="file_upload">Unggah Berkas</SelectItem>
                <SelectItem value="file_delete">Hapus Berkas</SelectItem>
                <SelectItem value="account_created">Akun Dibuat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Memuat log aktivitas...</p>
        </div>
      ) : logs.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-16 w-16 text-muted-foreground/50" />
            <p className="mt-4 text-xl font-medium">Belum ada aktivitas</p>
            <p className="text-muted-foreground">Tindakan Anda akan muncul di sini</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {logs.map((log) => {
                const Icon = getIcon(log.action_type);
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${getColor(log.action_type)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatAction(log.action_type)}</span>
                        <Badge variant="outline" className="text-xs">
                          {log.action_type}
                        </Badge>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.details.file_name && `Berkas: ${log.details.file_name}`}
                          {log.details.account_name && `Akun: ${log.details.account_name}`}
                          {log.details.size && ` • ${(log.details.size / 1024).toFixed(1)} KB`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(log.created_at).toLocaleDateString("id-ID", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
