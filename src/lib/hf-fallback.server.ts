// Hugging Face Inference fallback — FLUX.1-schnell (free tier)
// Used silently when Lovable AI returns 402 (no credits) or 429 (rate limit).
// User adds HF_TOKEN as a project secret later; until then this returns ok:false.

export type HfResult =
  | { ok: true; dataUrl: string }
  | { ok: false; status: number; error: string };

const FRIENDLY_MSG =
  "خدمة الدمج الذكي مشغولة حالياً — رجاءً أعد المحاولة بعد لحظات ✨";

export function friendlyAiError(): string {
  return FRIENDLY_MSG;
}

/**
 * Generate an image from a text prompt via Hugging Face (FLUX.1-schnell).
 * Used as a graceful fallback for inspiration / synthesis when Lovable AI is unavailable.
 * NOTE: HF inference is text->image only, so when we fall back from an
 * image-editing call we lose the input-image conditioning and re-synthesise
 * from the prompt — better than failing the request outright.
 */
export async function hfGenerateImage(prompt: string): Promise<HfResult> {
  const token = process.env.HF_TOKEN;
  if (!token) return { ok: false, status: 503, error: "HF_TOKEN missing" };

  const model = process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell";
  try {
    const res = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "image/png",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { num_inference_steps: 4, guidance_scale: 0.0 },
          options: { wait_for_model: true },
        }),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: text || `HF HTTP ${res.status}` };
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    // base64-encode
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    return { ok: true, dataUrl: `data:image/png;base64,${b64}` };
  } catch (e) {
    return { ok: false, status: 500, error: e instanceof Error ? e.message : String(e) };
  }
}
