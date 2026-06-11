// Client-side WebP compression (quality 92) — keeps blueprints razor-sharp
// while shrinking footprint for UV-printer pipelines and storage.
export async function toWebpQ92(srcUrl: string, quality = 0.92): Promise<string> {
  if (typeof window === "undefined") return srcUrl;
  try {
    const img = await loadImage(srcUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return srcUrl;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0);
    const webp = canvas.toDataURL("image/webp", quality);
    // Some browsers silently fall back to PNG if webp encoding fails — accept either.
    return webp.startsWith("data:image/") ? webp : srcUrl;
  } catch {
    return srcUrl;
  }
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
