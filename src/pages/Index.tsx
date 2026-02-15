import { useState, useMemo } from "react";
import { Bone, Menu, User } from "lucide-react";
import SpineScene from "@/components/SpineScene";
import HumanoidScene from "@/components/HumanoidScene";
import ControlPanel from "@/components/ControlPanel";

export type ActivityMode = "standing" | "walking" | "weightlifting";

const Index = () => {
  const [axialLoad, setAxialLoad] = useState(500);
  const [flexionAngle, setFlexionAngle] = useState(0);
  const [discHealth, setDiscHealth] = useState<"healthy" | "mild" | "severe">("healthy");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activity, setActivity] = useState<ActivityMode>("standing");

  // Sync: when activity changes to weightlifting, spike load
  const handleActivityChange = (newActivity: ActivityMode) => {
    setActivity(newActivity);
    if (newActivity === "weightlifting") {
      setAxialLoad((prev) => Math.max(prev, 1500));
      setFlexionAngle(8);
    } else if (newActivity === "standing") {
      setFlexionAngle(0);
    }
  };

  const handleReset = () => {
    setAxialLoad(500);
    setFlexionAngle(0);
    setDiscHealth("healthy");
    setActivity("standing");
  };

  // Compute herniation risk (same formula as ControlPanel)
  const herniationRisk = useMemo(() => {
    const loadFactor = axialLoad / 2000;
    const angleFactor = Math.abs(flexionAngle) / 15;
    const healthMultiplier = discHealth === "healthy" ? 0.5 : discHealth === "mild" ? 1 : 1.8;
    return Math.min(
      100,
      Math.round((loadFactor * 0.5 + angleFactor * 0.3 + loadFactor * angleFactor * 0.2) * healthMultiplier * 100)
    );
  }, [axialLoad, flexionAngle, discHealth]);

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
            activity={activity}
            setActivity={handleActivityChange}
            onReset={handleReset}
          />
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-background/50 z-10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Dual 3D Panels */}
        <main className="flex-1 flex flex-col md:flex-row relative">
          {/* Left: IVD Simulation */}
          <div className="flex-1 relative border-b md:border-b-0 md:border-r border-glow min-h-0">
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-md px-2.5 py-1.5 border border-glow">
              <Bone className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">IVD Model</span>
            </div>
            <SpineScene
              axialLoad={axialLoad}
              flexionAngle={flexionAngle}
              discHealth={discHealth}
            />
            <div className="absolute bottom-3 left-3 text-[10px] font-mono text-muted-foreground/60 space-y-0.5">
              <p>Drag to rotate • Scroll to zoom</p>
              <p>Load: {axialLoad}N • Angle: {flexionAngle}°</p>
            </div>
          </div>

          {/* Right: Humanoid Simulator */}
          <div className="flex-1 relative min-h-0">
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-md px-2.5 py-1.5 border border-glow">
              <User className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Humanoid — {activity === "standing" ? "Static" : activity === "walking" ? "Walking" : "Weightlifting"}
              </span>
            </div>
            <HumanoidScene
              axialLoad={axialLoad}
              flexionAngle={flexionAngle}
              herniationRisk={herniationRisk}
              activity={activity}
            />
            <div className="absolute bottom-3 left-3 text-[10px] font-mono text-muted-foreground/60 space-y-0.5">
              <p>Drag to rotate • Scroll to zoom</p>
              <p>Risk: {herniationRisk}% • Mode: {activity}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
