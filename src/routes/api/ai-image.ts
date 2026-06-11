import { createFileRoute } from "@tanstack/react-router";
import { aiEditImage } from "@/lib/ai-image-edit.server";
import { friendlyAiError, hfGenerateImage } from "@/lib/hf-fallback.server";

// توليد/تعديل صورة عبر Lovable AI Gateway (Gemini Image)
// المدخلات: prompt (نص)، image (اختياري base64 data URL) لتعديل صورة قائمة.
export const Route = createFileRoute("/api/ai-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt, image } = (await request.json()) as { prompt?: string; image?: string };
        if (!prompt || prompt.trim().length < 3) return json({ error: "اكتب وصفاً للصورة" }, 400);

        if (process.env.LOVABLE_API_KEY) {
          const primary = await aiEditImage(
            prompt,
            image && image.startsWith("data:image") ? [image] : [],
          );
          if (primary.ok) return json({ image_url: primary.dataUrl });
          console.warn("Lovable AI image route failed, trying Replicate fallback:", primary.status, primary.error);
        }

        const token = process.env.REPLICATE_API_TOKEN || process.env.VITE_REPLICATE_API_TOKEN;
        if (token) {
          const model = process.env.REPLICATE_IMAGE_MODEL || "black-forest-labs/flux-kontext-pro";
          const create = await fetch(
            `https://api.replicate.com/v1/models/${model}/predictions`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Prefer: "wait",
              },
              body: JSON.stringify({
                input: image && image.startsWith("data:image")
                  ? { input_image: image, prompt, output_format: "jpg", safety_tolerance: 2 }
                  : { prompt, output_format: "jpg", safety_tolerance: 2 },
              }),
            },
          );
          const pred = await create.json().catch(() => ({}));
          if (create.ok) {
            let status = pred.status as string, out = pred.output;
            const id = pred.id;
            for (let i = 0; i < 90 && (status === "starting" || status === "processing"); i++) {
              await new Promise((r) => setTimeout(r, 2000));
              const p = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const j = await p.json().catch(() => ({}));
              status = j.status; out = j.output;
            }
            if (status === "succeeded") {
              const url = Array.isArray(out) ? out[0] : out;
              if (url) return json({ image_url: url, fallback: "replicate" });
            }
          } else {
            console.warn("Replicate image create failed:", pred?.detail || pred?.error || create.status);
          }
        }

        const hf = await hfGenerateImage(prompt);
        if (hf.ok) return json({ image_url: hf.dataUrl, fallback: "hf" });

        return json({ fallback: true, error: friendlyAiError() });
      },
    },
  },
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
}
