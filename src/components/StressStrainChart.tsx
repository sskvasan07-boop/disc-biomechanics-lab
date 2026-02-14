import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface StressStrainChartProps {
  axialLoad: number;
  discHealth: "healthy" | "mild" | "severe";
}

export default function StressStrainChart({ axialLoad, discHealth }: StressStrainChartProps) {
  const youngModulus = useMemo(() => {
    switch (discHealth) {
      case "healthy": return 10; // MPa
      case "mild": return 6;
      case "severe": return 3;
    }
  }, [discHealth]);

  const crossSectionalArea = 1500; // mm²

  const data = useMemo(() => {
    const points = [];
    for (let f = 0; f <= 2000; f += 100) {
      const stress = f / crossSectionalArea; // MPa
      const strain = stress / youngModulus; // unitless
      points.push({
        strain: parseFloat((strain * 100).toFixed(3)),
        stress: parseFloat(stress.toFixed(4)),
        isCurrent: f <= axialLoad,
      });
    }
    return points;
  }, [axialLoad, youngModulus]);

  const activeData = data.filter((d) => d.isCurrent);

  const accentColor = useMemo(() => {
    switch (discHealth) {
      case "healthy": return "hsl(150, 70%, 45%)";
      case "mild": return "hsl(40, 80%, 50%)";
      case "severe": return "hsl(0, 70%, 50%)";
    }
  }, [discHealth]);

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(190, 100%, 50%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(190, 100%, 50%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity={0.5} />
              <stop offset="100%" stopColor={accentColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 18%)" />
          <XAxis
            dataKey="strain"
            tick={{ fill: "hsl(210, 15%, 55%)", fontSize: 10 }}
            label={{ value: "Strain (%)", position: "bottom", fill: "hsl(210, 15%, 55%)", fontSize: 10, dy: -5 }}
            stroke="hsl(210, 20%, 18%)"
          />
          <YAxis
            tick={{ fill: "hsl(210, 15%, 55%)", fontSize: 10 }}
            label={{ value: "σ (MPa)", angle: -90, position: "insideLeft", fill: "hsl(210, 15%, 55%)", fontSize: 10 }}
            stroke="hsl(210, 20%, 18%)"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(220, 25%, 10%)",
              border: "1px solid hsl(190, 100%, 50%, 0.3)",
              borderRadius: "8px",
              color: "hsl(200, 20%, 90%)",
              fontSize: 12,
            }}
          />
          {/* Full curve */}
          <Area
            type="monotone"
            dataKey="stress"
            stroke="hsl(190, 100%, 50%)"
            strokeWidth={1}
            fill="url(#stressGrad)"
            strokeOpacity={0.3}
            dot={false}
          />
          {/* Active curve up to current load */}
          <Line
            data={activeData}
            type="monotone"
            dataKey="stress"
            stroke={accentColor}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
