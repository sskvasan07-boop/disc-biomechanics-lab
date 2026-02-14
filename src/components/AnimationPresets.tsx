import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Square, Footprints, Dumbbell, ArrowDown } from "lucide-react";

interface Keyframe {
  axialLoad: number;
  flexionAngle: number;
  duration: number; // ms to reach this keyframe
}

interface Preset {
  name: string;
  icon: React.ElementType;
  keyframes: Keyframe[];
}

const presets: Preset[] = [
  {
    name: "Walking",
    icon: Footprints,
    keyframes: [
      { axialLoad: 400, flexionAngle: -3, duration: 400 },
      { axialLoad: 900, flexionAngle: 2, duration: 300 },
      { axialLoad: 600, flexionAngle: 5, duration: 250 },
      { axialLoad: 1100, flexionAngle: -1, duration: 300 },
      { axialLoad: 500, flexionAngle: -4, duration: 350 },
      { axialLoad: 900, flexionAngle: 3, duration: 300 },
      { axialLoad: 400, flexionAngle: -3, duration: 400 },
    ],
  },
  {
    name: "Heavy Lift",
    icon: Dumbbell,
    keyframes: [
      { axialLoad: 300, flexionAngle: 10, duration: 800 },
      { axialLoad: 1800, flexionAngle: 12, duration: 600 },
      { axialLoad: 1900, flexionAngle: 5, duration: 500 },
      { axialLoad: 1600, flexionAngle: -2, duration: 700 },
      { axialLoad: 800, flexionAngle: 0, duration: 600 },
      { axialLoad: 400, flexionAngle: 0, duration: 500 },
    ],
  },
  {
    name: "Sitting Impact",
    icon: ArrowDown,
    keyframes: [
      { axialLoad: 600, flexionAngle: 8, duration: 500 },
      { axialLoad: 700, flexionAngle: 10, duration: 2000 },
      { axialLoad: 1400, flexionAngle: 6, duration: 200 },
      { axialLoad: 800, flexionAngle: 9, duration: 400 },
      { axialLoad: 700, flexionAngle: 10, duration: 1500 },
      { axialLoad: 500, flexionAngle: 0, duration: 600 },
    ],
  },
];

interface AnimationPresetsProps {
  setAxialLoad: (v: number) => void;
  setFlexionAngle: (v: number) => void;
}

export default function AnimationPresets({ setAxialLoad, setFlexionAngle }: AnimationPresetsProps) {
  const [active, setActive] = useState<string | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef({ load: 0, angle: 0 });

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    setActive(null);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const play = (preset: Preset) => {
    if (active === preset.name) {
      stop();
      return;
    }
    stop();
    setActive(preset.name);

    const kf = preset.keyframes;
    // Build cumulative timeline
    const timeline: { time: number; load: number; angle: number }[] = [];
    let cumTime = 0;
    for (const k of kf) {
      cumTime += k.duration;
      timeline.push({ time: cumTime, load: k.axialLoad, angle: k.flexionAngle });
    }
    const totalDuration = cumTime;

    // Get starting values from first keyframe as reference
    startRef.current = { load: kf[0].axialLoad, angle: kf[0].flexionAngle };
    setAxialLoad(kf[0].axialLoad);
    setFlexionAngle(kf[0].flexionAngle);

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - startTime) % totalDuration;

      // Find current segment
      let prevTime = 0;
      let prevLoad = kf[0].axialLoad;
      let prevAngle = kf[0].flexionAngle;

      for (const t of timeline) {
        if (elapsed <= t.time) {
          const segDuration = t.time - prevTime;
          const segElapsed = elapsed - prevTime;
          const progress = segDuration > 0 ? segElapsed / segDuration : 1;
          // Ease in-out
          const ease = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          const load = Math.round(prevLoad + (t.load - prevLoad) * ease);
          const angle = Math.round(prevAngle + (t.angle - prevAngle) * ease);
          setAxialLoad(load);
          setFlexionAngle(angle);
          break;
        }
        prevTime = t.time;
        prevLoad = t.load;
        prevAngle = t.angle;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => {
        const isActive = active === preset.name;
        const Icon = preset.icon;
        return (
          <Button
            key={preset.name}
            size="sm"
            variant={isActive ? "default" : "outline"}
            className={
              isActive
                ? "font-mono text-xs"
                : "font-mono text-xs border-primary/30 text-primary hover:bg-primary/10"
            }
            onClick={() => play(preset)}
          >
            {isActive ? <Square className="h-3 w-3 mr-1.5" /> : <Icon className="h-3 w-3 mr-1.5" />}
            {preset.name}
          </Button>
        );
      })}
    </div>
  );
}
