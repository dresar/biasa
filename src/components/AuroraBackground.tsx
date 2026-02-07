import { cn } from "@/lib/utils";

interface AuroraBackgroundProps {
  children: React.ReactNode;
  className?: string;
  animated?: boolean;
}

export function AuroraBackground({ children, className, animated = true }: AuroraBackgroundProps) {
  return (
    <div className={cn("relative min-h-screen overflow-hidden bg-slate-950", className)}>
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Aurora gradient orbs */}
      <div className="fixed inset-0 -z-10">
        <div
          className={cn(
            "absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/30 blur-[100px] mix-blend-screen",
            animated && "animate-float"
          )}
        />
        <div
          className={cn(
            "absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-purple-600/30 blur-[100px] mix-blend-screen",
            animated && "animate-float"
          )}
          style={{ animationDelay: "2s" }}
        />
        <div
          className={cn(
            "absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[100px] mix-blend-screen",
            animated && "animate-float"
          )}
          style={{ animationDelay: "4s" }}
        />
      </div>
      
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50" />
      
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}
