import { useState, useCallback } from "react";
import { Bone, Menu } from "lucide-react";
import SpineScene from "@/components/SpineScene";
import ControlPanel from "@/components/ControlPanel";

const Index = () => {
  const [axialLoad, setAxialLoad] = useState(500);
  const [flexionAngle, setFlexionAngle] = useState(0);
  const [discHealth, setDiscHealth] = useState<"healthy" | "mild" | "severe">("healthy");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewportCanvas, setViewportCanvas] = useState<HTMLCanvasElement | null>(null);

  const mainRef = useCallback((node: HTMLElement | null) => {
    if (node) {
      const canvas = node.querySelector("canvas");
      if (canvas) setViewportCanvas(canvas);
    }
  }, []);

  const handleReset = () => {
    setAxialLoad(500);
    setFlexionAngle(0);
    setDiscHealth("healthy");
  };

  return (
    <div className="flex flex-col h-screen bg-background bg-grid">
      {/* Header */}
      <header className="h-14 border-b border-glow flex items-center px-4 gap-3 shrink-0 bg-card/80 backdrop-blur-sm z-10">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-2 rounded-md hover:bg-secondary text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center glow-cyan">
            <Bone className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-mono font-bold text-foreground tracking-wide glow-text">
              IVD-Sim
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
              Biomechanical Analysis Tool
            </p>
          </div>
        </div>

        {/* Status indicators */}
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Live Simulation</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:relative z-20 lg:z-0 h-[calc(100vh-3.5rem)] w-80 border-r border-glow bg-card/95 backdrop-blur-sm p-4 overflow-y-auto transition-transform duration-200 scrollbar-thin`}
        >
          <ControlPanel
            axialLoad={axialLoad}
            setAxialLoad={setAxialLoad}
            flexionAngle={flexionAngle}
            setFlexionAngle={setFlexionAngle}
            discHealth={discHealth}
            setDiscHealth={setDiscHealth}
            onReset={handleReset}
            viewportCanvas={viewportCanvas}
          />
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-background/50 z-10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 3D Scene */}
        <main className="flex-1 relative" ref={mainRef}>
          <SpineScene
            axialLoad={axialLoad}
            flexionAngle={flexionAngle}
            discHealth={discHealth}
          />

          {/* Scene overlay info */}
          <div className="absolute bottom-4 left-4 text-[10px] font-mono text-muted-foreground/60 space-y-0.5">
            <p>Drag to rotate • Scroll to zoom</p>
            <p>Load: {axialLoad}N • Angle: {flexionAngle}°</p>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t border-glow bg-card/80 backdrop-blur-sm py-4 text-center">
        <p className="text-xs font-mono text-muted-foreground">
          Made by S. S. Keerthi vasan, K. Priyadharshini, Siddiraju Mamatha
        </p>
      </footer>
    </div>
  );
};

export default Index;
