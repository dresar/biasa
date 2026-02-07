import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { api } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";

interface StorageData {
  name: string;
  size: number;
  fill: string;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function StorageChart() {
  const [data, setData] = useState<StorageData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchStorageStats = async () => {
      try {
        // Fetch all files with their storage account info
        const { data: files } = await api.files.list();
        const { data: accounts } = await api.storageCredentials.list();

        // Create a map of account names
        const accountMap = new Map<string, string>();
        accounts?.forEach((acc: any) => {
          accountMap.set(acc.id, acc.name);
        });

        // Aggregate sizes by storage account
        const sizeMap = new Map<string, number>();
        files?.forEach((file: any) => {
          const accountId = file.storage_account_id || "unknown";
          const currentSize = sizeMap.get(accountId) || 0;
          sizeMap.set(accountId, currentSize + (file.size || 0));
        });

        // Convert to chart data
        const chartData: StorageData[] = [];
        let colorIndex = 0;
        sizeMap.forEach((size, accountId) => {
          const accountName = accountMap.get(accountId) || "Tidak Diketahui";
          chartData.push({
            name: accountName,
            size: Math.round(size / (1024 * 1024) * 100) / 100, // Convert to MB
            fill: COLORS[colorIndex % COLORS.length],
          });
          colorIndex++;
        });

        setData(chartData);
      } catch (error) {
        console.error("Failed to fetch storage stats", error);
      }
      setLoading(false);
    };

    fetchStorageStats();
  }, [user]);

  const formatSize = (value: number) => {
    if (value >= 1024) {
      return `${(value / 1024).toFixed(1)} GB`;
    }
    return `${value.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistik Penggunaan Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Memuat data...</p>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistik Penggunaan Storage
          </CardTitle>
          <CardDescription>Penggunaan storage per akun ImageKit</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-muted-foreground">Belum ada data tersedia</p>
            <p className="text-sm text-muted-foreground">Unggah berkas untuk melihat statistik</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Statistik Penggunaan Storage
        </CardTitle>
        <CardDescription>Penggunaan storage per akun ImageKit</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis 
              dataKey="name" 
              className="text-xs fill-muted-foreground"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis 
              tickFormatter={formatSize}
              className="text-xs fill-muted-foreground"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => [formatSize(value), "Ukuran"]}
            />
            <Bar dataKey="size" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
