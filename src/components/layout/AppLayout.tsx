import { Outlet, Navigate, useLocation, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Settings, LogOut, Bell, Search, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";

export function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center aurora-bg">
        <div className="space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case "/": return "Dashboard";
      case "/dashboard": return "Dashboard";
      case "/files": return "Manajer Berkas";
      case "/upload": return "Pusat Unggah";
      case "/storage-accounts": return "Akun Penyimpanan";
      case "/categories": return "Kategori";
      case "/activity": return "Aktivitas";
      case "/profile": return "Profil Saya";
      case "/security": return "Keamanan";
      case "/api-config": return "Konfigurasi API";
      case "/help": return "Bantuan";
      default: return "Aplikasi";
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full aurora-bg">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 transition-all duration-300">
            <SidebarTrigger className="-ml-2 hover:bg-slate-800/50" />
            
            {/* Page Title / Breadcrumb */}
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground">
               <span className="text-foreground text-lg">{getPageTitle(location.pathname)}</span>
            </div>

            <div className="flex-1" />

            {/* Search (Visual) */}
            <div className="hidden md:flex relative w-64 mr-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari berkas..."
                className="w-full bg-slate-900/50 border-slate-800 pl-9 h-9 text-sm focus:bg-slate-900 transition-colors rounded-full"
              />
            </div>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-slate-800/50 rounded-full">
              <Bell className="h-5 w-5" />
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-transparent hover:ring-blue-500/50 transition-all p-0 overflow-hidden">
                  <Avatar className="h-full w-full border border-slate-700">
                    <AvatarImage src={user.avatar_url || ""} alt={user.full_name} className="object-cover" />
                    <AvatarFallback className="bg-slate-800 text-slate-200">
                      {getInitials(user.full_name || user.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-slate-950 border-slate-800 text-slate-200" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.full_name || "Pengguna"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem asChild className="focus:bg-slate-900 focus:text-white cursor-pointer">
                  <Link to="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="focus:bg-slate-900 focus:text-white cursor-pointer">
                  <Link to="/security">
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Keamanan</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="focus:bg-slate-900 focus:text-white cursor-pointer">
                  <Link to="/api-config">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Konfigurasi</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem 
                  className="text-red-400 focus:bg-red-900/20 focus:text-red-400 cursor-pointer"
                  onClick={signOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
