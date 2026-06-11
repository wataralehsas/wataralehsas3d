import { createFileRoute } from "@tanstack/react-router";
import { aiEditImage } from "@/lib/ai-image-edit.server";
import { hfGenerateImage, friendlyAiError } from "@/lib/hf-fallback.server";

// قصّات الشعر — Lovable AI (Gemini Nano Banana 2) أساسي + Replicate احتياطي
// قفل صارم على ملامح الوجه؛ التغيير محصور بمنطقة الشعر فقط.
export const Route = createFileRoute("/api/haircut")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { person, style, color, hairstyle_url } = (await request.json()) as {
            person: string; style?: string; color?: string; hairstyle_url?: string;
          };
          if (!person) return json({ error: "missing person image" }, 400);

          const styleText = (style?.trim() || "modern stylish haircut").replace(/\s+/g, " ");
          const colorText = color?.trim() ? `, hair color: ${color.trim()}` : "";
          const refClause = hairstyle_url
            ? `INPUT 2 is a HAIRSTYLE REFERENCE — copy ONLY the hair shape, length, parting, texture and styling from it. Do NOT copy its face, skin tone, lighting, background, age, gender, ethnicity or any other attribute.`
            : ``;

          const prompt = [
            `Photorealistic identity-locked hair edit. INPUT 1 = the real person photograph (the ONLY source of identity).`,
            refClause,
            `TASK: Replace ONLY the hair region of INPUT 1 with: ${styleText}${colorText}.`,
            `ABSOLUTE IDENTITY LOCK: Face, eyes, eyebrows, eyelashes, nose, mouth, lips, teeth, chin, jawline, ears, neck, skin tone, freckles, moles, age, gender expression, makeup and exact facial expression must remain 100% identical to INPUT 1, pixel-faithful. Do not beautify, smooth, slim or alter facial geometry in any way.`,
            `CONTEXT LOCK: Clothing, jewelry, accessories, background, camera angle, framing, lighting direction, color temperature, shadows and image grain remain identical to INPUT 1.`,
            `HAIR REGION ONLY: Re-grow hair organically from the actual scalp — natural hairline, baby hairs, follicle direction, realistic shine, individual strands and stray hairs. Blend hair edges seamlessly with the forehead, temples and neck. No flat sticker overlays, no symmetric stamping, no cartoon look.`,
            `OUTPUT: One photorealistic image at the same resolution and aspect ratio as INPUT 1. Return ONLY the edited image.`,
          ].filter(Boolean).join(" ");

          // 1) Lovable AI primary
          if (process.env.LOVABLE_API_KEY) {
            const imgs = hairstyle_url ? [person, hairstyle_url] : [person];
            const r = await aiEditImage(prompt, imgs);
            if (r.ok) return json({ result_url: r.dataUrl });
            console.warn("Lovable AI haircut failed, trying Replicate:", r.error);
          }

          // 2) Replicate fallback if owner key present
          const token = process.env.REPLICATE_API_TOKEN || process.env.VITE_REPLICATE_API_TOKEN;
          if (!token) {
            // 3) Hugging Face silent fallback (free tier)
            const hf = await hfGenerateImage(prompt);
            if (hf.ok) return json({ result_url: hf.dataUrl, fallback: "hf" });
            return json({ fallback: true, error: friendlyAiError() });
          }

          const model = process.env.REPLICATE_HAIRCUT_MODEL || "flux-kontext-apps/change-haircut";
          const isChangeHaircut = model.includes("change-haircut");
          const input = isChangeHaircut
            ? {
                input_image: person,
                haircut: styleText,
                hair_color: color?.trim() || "No change",
                aspect_ratio: "match_input_image",
                output_format: "jpg",
                safety_tolerance: 2,
              }
            : { input_image: person, prompt, output_format: "jpg", safety_tolerance: 2 };

          const create = await fetch(
            `https://api.replicate.com/v1/models/${model}/predictions`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
              body: JSON.stringify({ input }),
            },
          );
          const pred = await create.json();
          if (!create.ok) {
            return json({ error: String(pred?.detail || pred?.error || "create failed"), fallback: true });
          }

          let status = pred.status as string, out = pred.output;
          const id = pred.id;
          for (let i = 0; i < 90 && (status === "starting" || status === "processing"); i++) {
            await new Promise((r) => setTimeout(r, 2000));
            const p = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const j = await p.json();
            status = j.status; out = j.output;
          }
          if (status !== "succeeded") return json({ error: `status=${status}`, fallback: true });
          const url = Array.isArray(out) ? out[0] : out;
          return json({ result_url: url });
        } catch (e) {
          console.error("/api/haircut failed:", e);
          return json({ error: e instanceof Error ? e.message : String(e), fallback: true });
        }
      },
    },
  },
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
}
