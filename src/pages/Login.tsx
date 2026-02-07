import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Cloud, Eye, EyeOff, Lock, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuroraBackground } from "@/components/AuroraBackground";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Selamat datang kembali di Era Baru Penyimpanan!");
      navigate("/dashboard");
    }

    setIsLoading(false);
  };

  return (
    <AuroraBackground className="flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side: Hero / Branding */}
        <div className="hidden lg:flex flex-col space-y-8 p-8 animate-in slide-in-from-left duration-700">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-300 backdrop-blur-xl">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
              Next Gen Storage
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white">
              Penyimpanan <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Cerdas & Tanpa Batas
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
              Kelola aset digital Anda dengan kekuatan AI. Optimasi otomatis, keamanan tingkat tinggi, dan akses super cepat di satu platform terpadu.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { title: "Optimasi AI", desc: "Kompresi cerdas otomatis" },
              { title: "Keamanan Enkripsi", desc: "End-to-end encryption" },
              { title: "CDN Global", desc: "Akses kilat dari mana saja" },
              { title: "Manajemen Aset", desc: "Organisasi folder intuitif" }
            ].map((item, i) => (
              <div key={i} className="group p-4 rounded-xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm hover:bg-slate-800/60 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-400" />
                  <h3 className="font-semibold text-slate-200">{item.title}</h3>
                </div>
                <p className="text-sm text-slate-500 pl-8">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full max-w-md mx-auto animate-in slide-in-from-right duration-700 delay-200">
          <div className="relative group">
            {/* Glow Effect behind card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            
            <div className="relative bg-slate-950/80 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-[1px] mb-4 shadow-lg shadow-blue-500/20">
                  <div className="h-full w-full rounded-2xl bg-slate-950 flex items-center justify-center">
                    <Cloud className="h-8 w-8 text-blue-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white">Selamat Datang Kembali</h2>
                <p className="text-slate-400 mt-2">Masuk untuk mengakses ruang kerja Anda</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300 ml-1">Email</Label>
                  <div className="relative group/input">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-focus-within/input:text-blue-400 transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nama@perusahaan.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 bg-slate-900/50 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <Label htmlFor="password" className="text-slate-300">Kata Sandi</Label>
                    <Link to="#" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      Lupa kata sandi?
                    </Link>
                  </div>
                  <div className="relative group/input">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-focus-within/input:text-blue-400 transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 pr-10 bg-slate-900/50 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all h-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-500 hover:text-slate-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-900/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memproses...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Masuk Sekarang <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-slate-500">
                  Belum memiliki akun?{" "}
                  <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors hover:underline">
                    Daftar Gratis
                  </Link>
                </p>
              </div>
            </div>
          </div>
          
          {/* Footer links */}
          <div className="mt-8 flex justify-center gap-6 text-sm text-slate-600">
            <Link to="#" className="hover:text-slate-400 transition-colors">Privasi</Link>
            <Link to="#" className="hover:text-slate-400 transition-colors">Syarat & Ketentuan</Link>
            <Link to="#" className="hover:text-slate-400 transition-colors">Bantuan</Link>
          </div>
        </div>
      </div>
    </AuroraBackground>
  );
}
