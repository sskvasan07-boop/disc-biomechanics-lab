import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw, Activity, Gauge, TrendingUp, AlertTriangle, FileDown } from "lucide-react";
import StressStrainChart from "./StressStrainChart";
import HerniationGauge from "./HerniationGauge";
import { useRef, useState } from "react";
import { exportSimulationPdf } from "@/lib/exportPdf";

interface ControlPanelProps {
  axialLoad: number;
  setAxialLoad: (v: number) => void;
  flexionAngle: number;
  setFlexionAngle: (v: number) => void;
  discHealth: "healthy" | "mild" | "severe";
  setDiscHealth: (v: "healthy" | "mild" | "severe") => void;
  onReset: () => void;
}

function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ElementType;
  variant?: "default" | "low" | "medium" | "high";
}) {
  const variantClasses = {
    default: "border-glow",
    low: "border-risk-low/30",
    medium: "border-mild-degen/30",
    high: "border-severe-degen/30",
  };

  const iconColors = {
    default: "text-primary",
    low: "text-risk-low",
    medium: "text-mild-degen",
    high: "text-risk-high",
  };

  return (
    <div className={`rounded-lg border bg-card p-3 ${variantClasses[variant]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-3.5 w-3.5 ${iconColors[variant]}`} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-mono font-bold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

export default function ControlPanel({
  axialLoad,
  setAxialLoad,
  flexionAngle,
  setFlexionAngle,
  discHealth,
  setDiscHealth,
  onReset,
}: ControlPanelProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSimulationPdf(
        { axialLoad, flexionAngle, discHealth },
        chartRef.current
      );
    } finally {
      setExporting(false);
    }
  };

  // Calculate metrics
  const crossSectionalArea = 1500; // mm²
  const stress = axialLoad / crossSectionalArea; // MPa

  const youngModulus = discHealth === "healthy" ? 10 : discHealth === "mild" ? 6 : 3;
  const strain = stress / youngModulus;

  // Herniation risk: combination of load, angle, and disc health
  const loadFactor = axialLoad / 2000;
  const angleFactor = Math.abs(flexionAngle) / 15;
  const healthMultiplier = discHealth === "healthy" ? 0.5 : discHealth === "mild" ? 1 : 1.8;
  const herniationRisk = Math.min(
    100,
    Math.round((loadFactor * 0.5 + angleFactor * 0.3 + loadFactor * angleFactor * 0.2) * healthMultiplier * 100)
  );

  const riskVariant = herniationRisk < 30 ? "low" : herniationRisk < 65 ? "medium" : "high";

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Controls */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-4 flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Simulation Controls
        </h3>

        <div className="space-y-5">
          {/* Axial Load */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-foreground font-medium">Axial Load</label>
              <span className="text-xs font-mono text-primary">{axialLoad} N</span>
            </div>
            <Slider
              value={[axialLoad]}
              onValueChange={([v]) => setAxialLoad(v)}
              min={0}
              max={2000}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">0 N</span>
              <span className="text-[10px] text-muted-foreground">2000 N</span>
            </div>
          </div>

          {/* Flexion Angle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-foreground font-medium">Flexion / Extension</label>
              <span className="text-xs font-mono text-primary">{flexionAngle}°</span>
            </div>
            <Slider
              value={[flexionAngle]}
              onValueChange={([v]) => setFlexionAngle(v)}
              min={-15}
              max={15}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">-15° Ext</span>
              <span className="text-[10px] text-muted-foreground">+15° Flex</span>
            </div>
          </div>

          {/* Disc Health */}
          <div>
            <label className="text-sm text-foreground font-medium block mb-2">Disc Health Status</label>
            <Select value={discHealth} onValueChange={(v) => setDiscHealth(v as "healthy" | "mild" | "severe")}>
              <SelectTrigger className="w-full bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="healthy">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-healthy" />
                    Healthy
                  </span>
                </SelectItem>
                <SelectItem value="mild">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-mild-degen" />
                    Mild Degeneration
                  </span>
                </SelectItem>
                <SelectItem value="severe">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-severe-degen" />
                    Severely Degenerated
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-3 flex items-center gap-2">
          <Gauge className="h-3.5 w-3.5 text-primary" />
          Computed Metrics
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Stress (σ)" value={stress.toFixed(3)} unit="MPa" icon={TrendingUp} />
          <MetricCard label="Strain (ε)" value={(strain * 100).toFixed(2)} unit="%" icon={Activity} />
          <MetricCard label="Young's Mod" value={youngModulus.toString()} unit="MPa" icon={Gauge} />
          <MetricCard
            label="Herniation Risk"
            value={herniationRisk.toString()}
            unit="%"
            icon={AlertTriangle}
            variant={riskVariant}
          />
        </div>
      </div>

      {/* Gauge */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-3 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-primary" />
          Herniation Risk
        </h3>
        <div className="rounded-lg border border-glow bg-card p-3">
          <HerniationGauge risk={herniationRisk} />
        </div>
      </div>

      {/* Chart */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-3 flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          Stress vs Strain
        </h3>
        <div ref={chartRef} className="rounded-lg border border-glow bg-card p-2">
          <StressStrainChart axialLoad={axialLoad} discHealth={discHealth} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={onReset}
          variant="outline"
          className="flex-1 border-primary/30 text-primary hover:bg-primary/10 font-mono"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button
          onClick={handleExport}
          disabled={exporting}
          variant="outline"
          className="flex-1 border-primary/30 text-primary hover:bg-primary/10 font-mono"
        >
          <FileDown className="h-4 w-4 mr-2" />
          {exporting ? "Exporting…" : "Export PDF"}
        </Button>
      </div>
    </div>
  );
}
