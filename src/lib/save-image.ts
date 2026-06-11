// مساعدات حفظ/مشاركة الصور على الجوال مع علامة مائية فاخرة "وتر الإحساس 3D"
import { toast } from "sonner";

async function urlToBlob(url: string): Promise<Blob> {
  if (url.startsWith("data:")) {
    const res = await fetch(url);
    return await res.blob();
  }
  const res = await fetch(url, { mode: "cors" });
  return await res.blob();
}

// يضيف علامة مائية شفافة في الزاوية السفلى اليمنى ويُعيد Blob جديد (JPEG)
async function addWatermark(blob: Blob, text = "وتر الإحساس 3D"): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob);
    const w = bitmap.width, h = bitmap.height;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.drawImage(bitmap, 0, 0);

    const fontSize = Math.max(18, Math.round(Math.min(w, h) * 0.035));
    const pad = Math.round(fontSize * 0.7);
    ctx.font = `900 ${fontSize}px "Tajawal","Cairo",system-ui,sans-serif`;
    ctx.textBaseline = "bottom";
    ctx.textAlign = "right";
    ctx.direction = "rtl";

    const metrics = ctx.measureText(text);
    const boxW = metrics.width + pad * 2;
    const boxH = fontSize + pad;
    const x = w - pad / 2;
    const y = h - pad / 2;

    // خلفية زجاجية شفافة
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    roundRect(ctx, w - boxW - pad / 2, h - boxH - pad / 2, boxW, boxH, fontSize * 0.35);
    ctx.fill();

    // نص أبيض مع ظل ناعم
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = fontSize * 0.4;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(text, x, y);

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b ?? blob), "image/jpeg", 0.92);
    });
  } catch {
    return blob;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function saveImageToDevice(url: string, filename = `watar-${Date.now()}.jpg`) {
  try {
    const raw = await urlToBlob(url);
    const blob = await addWatermark(raw);
    const file = new File([blob], filename, { type: "image/jpeg" });

    const navAny = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (navAny.canShare && navAny.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "وتر الإحساس", text: "صورة من وتر الإحساس 3D" });
      toast.success("تم إرسال الصورة — اختر «حفظ في الصور» من القائمة");
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    toast.success("تم تنزيل الصورة بشعار وتر الإحساس 3D");
  } catch {
    toast.error("تعذّر الحفظ — جرّب الضغط المطوّل على الصورة ثم «حفظ»");
  }
}

export async function shareImageWhatsApp(url: string, text = "شاهد صورتي من وتر الإحساس 3D ✨") {
  try {
    const raw = await urlToBlob(url);
    const blob = await addWatermark(raw);
    const file = new File([blob], `watar-${Date.now()}.jpg`, { type: "image/jpeg" });
    const navAny = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (navAny.canShare && navAny.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank");
  } catch {
    window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank");
  }
}
