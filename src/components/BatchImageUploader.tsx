import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import imageCompression from "browser-image-compression";
import {
  UploadCloud, Loader2, ImagePlus, Crop as CropIcon, RotateCw, X, Check, Trash2,
} from "lucide-react";
import { toast } from "sonner";

export type BatchItem = { dataUrl: string; name: string };

type Props = {
  onUploaded: (items: BatchItem[]) => Promise<void> | void;
  maxFiles?: number;
  maxWidthPx?: number;
  maxSizeMB?: number;
  hint?: string;
};

type DraftItem = {
  id: string;
  name: string;
  originalUrl: string; // قبل القص (مضغوط مبدئياً)
  editedUrl: string;   // الناتج النهائي (يبدأ = originalUrl)
};

const ASPECTS: { id: string; label: string; value: number | undefined }[] = [
  { id: "1:1", label: "١:١", value: 1 },
  { id: "4:3", label: "٤:٣", value: 4 / 3 },
  { id: "16:9", label: "١٦:٩", value: 16 / 9 },
  { id: "free", label: "حر", value: undefined },
];

/** يقص الصورة من dataUrl إلى dataUrl جديد (WebP) وفق منطقة + تدوير */
async function getCroppedWebP(
  src: string,
  pixelCrop: Area,
  rotation: number,
  maxWidth = 1400,
  quality = 0.85,
): Promise<string> {
  const img = await loadImage(src);
  const rot = (rotation * Math.PI) / 180;

  // كانفاس وسيط بحجم الصورة كاملة بعد التدوير لتفادي القص الجانبي
  const sin = Math.abs(Math.sin(rot));
  const cos = Math.abs(Math.cos(rot));
  const bW = img.width * cos + img.height * sin;
  const bH = img.width * sin + img.height * cos;

  const big = document.createElement("canvas");
  big.width = bW; big.height = bH;
  const bctx = big.getContext("2d")!;
  bctx.translate(bW / 2, bH / 2);
  bctx.rotate(rot);
  bctx.drawImage(img, -img.width / 2, -img.height / 2);

  // اقتطاع المنطقة
  const out = document.createElement("canvas");
  let w = pixelCrop.width, h = pixelCrop.height;
  if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
  out.width = Math.round(w); out.height = Math.round(h);
  const octx = out.getContext("2d")!;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(
    big,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, out.width, out.height,
  );

  return out.toDataURL("image/webp", quality);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function BatchImageUploader({
  onUploaded,
  maxFiles = 100,
  maxWidthPx = 1400,
  maxSizeMB = 0.45,
  hint = "اختر الصور — يمكنك القص والتدوير وتعديل النسبة قبل الحفظ.",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [drag, setDrag] = useState(false);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function ingest(files: File[]) {
    if (!files.length) return;
    if (drafts.length + files.length > maxFiles) {
      toast.message(`الحد الأقصى ${maxFiles} صورة — سيتم أخذ ما يتسع فقط`);
      files = files.slice(0, maxFiles - drafts.length);
    }
    setBusy(true);
    setProgress({ done: 0, total: files.length });
    const next: DraftItem[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const compressed = await imageCompression(files[i], {
          maxSizeMB,
          maxWidthOrHeight: maxWidthPx,
          useWebWorker: true,
          fileType: "image/webp",
          initialQuality: 0.82,
        });
        const dataUrl = await imageCompression.getDataUrlFromFile(compressed);
        next.push({
          id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
          name: files[i].name.replace(/\.[^.]+$/, ""),
          originalUrl: dataUrl,
          editedUrl: dataUrl,
        });
      } catch (e) { console.error("compress fail", e); }
      setProgress({ done: i + 1, total: files.length });
    }
    setDrafts((d) => [...d, ...next]);
    setBusy(false);
    setProgress({ done: 0, total: 0 });
    if (inputRef.current) inputRef.current.value = "";
  }

  async function saveAll() {
    if (!drafts.length) return;
    setBusy(true);
    try {
      const items: BatchItem[] = drafts.map((d) => ({ dataUrl: d.editedUrl, name: d.name }));
      const CHUNK = 10;
      for (let i = 0; i < items.length; i += CHUNK) {
        await onUploaded(items.slice(i, i + CHUNK));
      }
      toast.success(`تم حفظ ${items.length} صورة`);
      setDrafts([]);
    } catch (e: any) {
      toast.error(e?.message ?? "تعذّر الحفظ");
    } finally { setBusy(false); }
  }

  const editing = drafts.find((d) => d.id === editingId) ?? null;

  return (
    <>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false);
          void ingest(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")));
        }}
        className={`rounded-2xl border-2 border-dashed p-6 transition ${drag ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple
          onChange={(e) => void ingest(Array.from(e.target.files ?? []))} className="hidden" />
        <div className="flex flex-col items-center text-center gap-3">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            {busy ? <Loader2 className="size-7 animate-spin" /> : <UploadCloud className="size-7" />}
          </div>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-primary-foreground shadow-soft disabled:opacity-50">
              <ImagePlus className="size-4" /> اختر الصور
            </button>
            {drafts.length > 0 && (
              <button type="button" disabled={busy} onClick={() => void saveAll()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-soft disabled:opacity-50">
                <Check className="size-4" /> حفظ الكل ({drafts.length})
              </button>
            )}
          </div>
          {busy && progress.total > 0 && (
            <p className="text-[11px] text-muted-foreground">جارٍ المعالجة… {progress.done}/{progress.total}</p>
          )}
        </div>

        {drafts.length > 0 && (
          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {drafts.map((d) => (
              <div key={d.id} className="group relative overflow-hidden rounded-xl border bg-card">
                <img src={d.editedUrl} alt={d.name} className="aspect-square w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                  <button type="button" onClick={() => setEditingId(d.id)}
                    className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[10px] font-black text-foreground">
                    <CropIcon className="size-3" /> تعديل
                  </button>
                  <button type="button" onClick={() => setDrafts((arr) => arr.filter((x) => x.id !== d.id))}
                    className="inline-flex items-center justify-center rounded-md bg-red-600 p-1 text-white">
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <CropperModal
          item={editing}
          onClose={() => setEditingId(null)}
          onSave={(url) => {
            setDrafts((arr) => arr.map((x) => x.id === editing.id ? { ...x, editedUrl: url } : x));
            setEditingId(null);
          }}
          maxWidth={maxWidthPx}
        />
      )}
    </>
  );
}

function CropperModal({
  item, onClose, onSave, maxWidth,
}: { item: DraftItem; onClose: () => void; onSave: (url: string) => void; maxWidth: number; }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onComplete = useCallback((_a: Area, px: Area) => setPixels(px), []);

  async function apply() {
    if (!pixels) return;
    setSaving(true);
    try {
      const url = await getCroppedWebP(item.originalUrl, pixels, rotation, maxWidth, 0.85);
      onSave(url);
    } catch (e) {
      console.error(e);
      toast.error("تعذّر تطبيق القص");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-3" dir="rtl">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <h3 className="text-sm font-black">تعديل الصورة</h3>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted"><X className="size-4" /></button>
        </div>

        <div className="relative h-[55vh] bg-black">
          <Cropper
            image={item.originalUrl}
            crop={crop} zoom={zoom} rotation={rotation} aspect={aspect}
            onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation}
            onCropComplete={onComplete}
            restrictPosition={false}
            objectFit="contain"
          />
        </div>

        <div className="space-y-3 border-t p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground">النسبة:</span>
            {ASPECTS.map((a) => (
              <button key={a.id} type="button" onClick={() => setAspect(a.value)}
                className={`rounded-lg px-3 py-1 text-[11px] font-black transition ${aspect === a.value ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}>
                {a.label}
              </button>
            ))}
            <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)}
              className="ms-auto inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1 text-[11px] font-black hover:bg-muted/70">
              <RotateCw className="size-3" /> تدوير ٩٠°
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-muted-foreground">تكبير</span>
            <input type="range" min={1} max={3} step={0.01} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-primary" />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-xl bg-muted px-4 py-2 text-xs font-black hover:bg-muted/70">إلغاء</button>
            <button onClick={() => void apply()} disabled={saving || !pixels}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-black text-primary-foreground disabled:opacity-50">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              تطبيق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PriceOrTrialBadge({
  price, currency,
}: { price: number | null | undefined; currency?: string | null }) {
  if (price != null && Number(price) > 0) {
    return (
      <p className="mt-1 text-sm font-black text-primary">
        {Number(price).toLocaleString("ar")}
        {currency ? <span className="text-xs opacity-80"> {currency}</span> : null}
      </p>
    );
  }
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-bold text-primary">
      ✦ للتجربة والمعاينة الافتراضية
    </span>
  );
}
