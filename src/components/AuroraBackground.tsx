import { cn } from "@/lib/utils";

interface AuroraBackgroundProps {
  children: React.ReactNode;
  className?: string;
  animated?: boolean;
}

export function AuroraBackground({ children, className, animated = true }: AuroraBackgroundProps) {
  return (
    <div className={cn("relative min-h-screen overflow-hidden bg-slate-950", className)}>
      {/* Aurora gradient orbs */}
      <div className="fixed inset-0 -z-10">
        <div
          className={cn(
            "absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl",
            animated && "animate-float"
          )}
        />
        <div
          className={cn(
            "absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl",
            animated && "animate-float"
          )}
          style={{ animationDelay: "1s" }}
        />
        <div
          className={cn(
            "absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full bg-slate-600/20 blur-3xl",
            animated && "animate-float"
          )}
          style={{ animationDelay: "2s" }}
        />
      </div>
      {children}
    </div>
  );
}
