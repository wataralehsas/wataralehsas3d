import { useCallback, useEffect, useRef, useState } from "react";
import { Move, Maximize2, RotateCcw } from "lucide-react";

export type DesignBox = { x: number; y: number; w: number; h: number; opacity: number };

type Props = {
  src: string;
  name?: string;
  box: DesignBox;
  onChange: (b: DesignBox) => void;
  container: React.RefObject<HTMLDivElement | null>;
  /** يفعّل مصفوفة بروز SVG عالية التباين لمحاكاة الطباعة UV الملموسة */
  embossed?: boolean;
};

/**
 * طبقة تصميم قابلة للسحب والتحجيم فوق صورة الجدار الثابتة.
 * تستخدم Vector-Grid Mapping (object-cover + image-rendering crisp) لتفادي البلر
 * وعند تفعيل embossed تُطبَّق فلتر SVG displacement لإبراز العروق الفيزيائية.
 */
export function DraggableDesignLayer({ src, name, box, onChange, container, embossed }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"drag" | "resize" | null>(null);
  const start = useRef<{ px: number; py: number; box: DesignBox } | null>(null);

  const onDown = useCallback((m: "drag" | "resize") => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setMode(m);
    start.current = { px: e.clientX, py: e.clientY, box: { ...box } };
  }, [box]);

  useEffect(() => {
    if (!mode) return;
    function onMove(e: PointerEvent) {
      const s = start.current; const c = container.current;
      if (!s || !c) return;
      const rect = c.getBoundingClientRect();
      const dx = ((e.clientX - s.px) / rect.width) * 100;
      const dy = ((e.clientY - s.py) / rect.height) * 100;
      if (mode === "drag") {
        onChange({
          ...s.box,
          x: Math.max(0, Math.min(100 - s.box.w, s.box.x + dx)),
          y: Math.max(0, Math.min(100 - s.box.h, s.box.y + dy)),
        });
      } else {
        onChange({
          ...s.box,
          w: Math.max(10, Math.min(100 - s.box.x, s.box.w + dx)),
          h: Math.max(10, Math.min(100 - s.box.y, s.box.h + dy)),
        });
      }
    }
    function onUp() { setMode(null); start.current = null; }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [mode, container, onChange]);

  // فلتر SVG لمحاكاة البروز الـ UV — تباين عالي + ظلال داخلية حادّة
  const embossFilter = embossed ? "url(#watar-emboss)" : undefined;
  const embossShadow = embossed
    ? "drop-shadow(0 1px 0 rgba(0,0,0,.55)) drop-shadow(0 -1px 0 rgba(255,255,255,.35))"
    : undefined;

  return (
    <div
      ref={ref}
      className="absolute touch-none select-none"
      style={{
        left: `${box.x}%`, top: `${box.y}%`,
        width: `${box.w}%`, height: `${box.h}%`,
        opacity: box.opacity,
        mixBlendMode: "multiply",
      }}
    >
      {/* تعريف فلتر البروز مرّة واحدة على كامل الطبقة */}
      {embossed && (
        <svg width="0" height="0" className="absolute" aria-hidden>
          <filter id="watar-emboss">
            <feConvolveMatrix order="3" kernelMatrix="-2 -1 0  -1 1 1  0 1 2" preserveAlpha="true" />
            <feColorMatrix type="saturate" values="1.4" />
          </filter>
        </svg>
      )}
      <img
        src={src}
        alt={name ?? "design"}
        draggable={false}
        decoding="async"
        className="size-full rounded-lg object-cover shadow-2xl"
        style={{
          imageRendering: "crisp-edges",
          filter: [embossFilter, embossShadow].filter(Boolean).join(" ") || undefined,
          contrast: embossed ? 1.15 : undefined,
        } as React.CSSProperties}
      />
      {/* drag overlay */}
      <button onPointerDown={onDown("drag")}
        aria-label="سحب التصميم"
        className="absolute inset-0 cursor-move opacity-0">drag</button>
      {/* drag chip */}
      <span className="pointer-events-none absolute -top-3 right-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground shadow">
        <Move className="size-3" /> اسحب
      </span>
      {embossed && (
        <span className="pointer-events-none absolute -top-3 left-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-black text-accent-foreground shadow">
          بروز +30%
        </span>
      )}
      {/* resize handle */}
      <button onPointerDown={onDown("resize")}
        aria-label="تكبير وتصغير"
        className="absolute -left-1 -bottom-1 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-background"
        style={{ cursor: "nwse-resize" }}>
        <Maximize2 className="size-3" />
      </button>
    </div>
  );
}

export function resetBox(): DesignBox {
  return { x: 15, y: 18, w: 60, h: 55, opacity: 0.85 };
}

export { RotateCcw };
