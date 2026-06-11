import { useSettings } from "@/lib/settings";
import { Play } from "lucide-react";

/**
 * شريط فيديوهات تعريفية يظهر للزبائن في أعلى الصفحة الرئيسية —
 * يعرض عمل الطابعة الليزرية للجدران والأرضيات.
 */
export function VideoStrip() {
  const [s] = useSettings();
  const vids = s.customVideos ?? [];
  if (vids.length === 0) return null;

  return (
    <section className="border-y border-border bg-card/40 backdrop-blur" dir="rtl">
      <div className="mx-auto max-w-6xl px-5 py-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-black text-primary">
          <Play className="size-3.5 fill-current" /> شاهد طابعة الليزر أثناء العمل
        </div>
        <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {vids.map((v) => (
            <div
              key={v.id}
              className="snap-start overflow-hidden rounded-2xl border border-border bg-black shadow-soft"
              style={{ flex: "0 0 78%", maxWidth: 320 }}
            >
              <video
                src={v.url}
                controls
                playsInline
                preload="metadata"
                className="block aspect-video w-full bg-black object-cover"
              />
              {v.title && (
                <p className="px-3 py-2 text-[11px] font-bold text-foreground/80">{v.title}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
