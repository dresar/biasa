import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  Upload,
  Database,
  Tags,
  Settings,
  User,
  Shield,
  Activity,
  HelpCircle,
  Cloud,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Kelola Berkas", url: "/files", icon: FolderOpen },
  { title: "Pusat Unggah", url: "/upload", icon: Upload },
  { title: "Akun Penyimpanan", url: "/storage-accounts", icon: Database },
  { title: "Kategori", url: "/categories", icon: Tags },
];

const settingsNavItems = [
  { title: "Konfigurasi API", url: "/api-config", icon: Settings },
  { title: "Profil", url: "/profile", icon: User },
  { title: "Keamanan", url: "/security", icon: Shield },
  { title: "Log Aktivitas", url: "/activity", icon: Activity },
  { title: "Bantuan & Dokumen", url: "/help", icon: HelpCircle },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-800 bg-slate-950/95 backdrop-blur-xl text-slate-300"
    >
      <SidebarHeader className="border-b border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-900/20">
            <Cloud className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="animate-fade-in">
              <h1 className="font-semibold text-white tracking-tight">CloudOrchestrator</h1>
              <p className="text-xs text-slate-500">Manajer Penyimpanan</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-500 uppercase tracking-wider text-xs font-semibold px-2 mb-2">
            Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="hover:bg-slate-800/50 hover:text-white transition-all duration-200"
                  >
                    <NavLink
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all group",
                        isActive(item.url)
                          ? "bg-gradient-to-r from-blue-600/10 to-cyan-600/10 text-blue-400 border-l-2 border-blue-500"
                          : "text-slate-400 hover:bg-slate-900 hover:text-blue-200"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 transition-colors", isActive(item.url) ? "text-blue-400" : "text-slate-500 group-hover:text-blue-300")} />
                      <span className="font-medium">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-slate-500 uppercase tracking-wider text-xs font-semibold px-2 mb-2">
            Pengaturan
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="hover:bg-slate-800/50 hover:text-white transition-all duration-200"
                  >
                    <NavLink
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all group",
                        isActive(item.url)
                          ? "bg-gradient-to-r from-blue-600/10 to-cyan-600/10 text-blue-400 border-l-2 border-blue-500"
                          : "text-slate-400 hover:bg-slate-900 hover:text-blue-200"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 transition-colors", isActive(item.url) ? "text-blue-400" : "text-slate-500 group-hover:text-blue-300")} />
                      <span className="font-medium">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-800 p-4 bg-slate-950/50">
        <div className="flex items-center justify-between">
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
