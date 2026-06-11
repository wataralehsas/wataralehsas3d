import { createFileRoute } from "@tanstack/react-router";
import { aiEditImage } from "@/lib/ai-image-edit.server";
import { hfGenerateImage, friendlyAiError } from "@/lib/hf-fallback.server";

// تجربة الأزياء — Lovable AI أساسي + Replicate احتياطي
// الذكاء يتعرّف نوع القطعة (فستان/قميص/بنطال...) ويستبدل المنطقة المناسبة فقط.
export const Route = createFileRoute("/api/tryon")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { person, garment_url, garment_desc, garment_type } = (await request.json()) as {
            person: string; garment_url: string; garment_desc?: string; garment_type?: string;
          };
          if (!person || !garment_url) return json({ error: "missing inputs" }, 400);

          const desc = (garment_desc || "the garment shown in INPUT 2").trim();
          const typeHint = (garment_type || "").trim().toLowerCase();
          const regionMap: Record<string, string> = {
            dress: "ENTIRE torso + lower body region down to the hem (replace any existing top, blouse, shirt, skirt or pants the person is wearing in that region).",
            abaya: "ENTIRE body silhouette from shoulders down to ankles (replace any existing outer clothing).",
            shirt: "Upper-body region only (chest, shoulders, arms) — do NOT alter pants, skirt or lower body.",
            tshirt: "Upper-body region only (chest, shoulders, arms) — do NOT alter pants, skirt or lower body.",
            jacket: "Outer-layer upper body only — keep underlying shirt visible at neckline and cuffs if natural.",
            pants: "Lower-body region only (waist down) — do NOT alter shirt, jacket or upper body.",
            skirt: "Lower-body region from waist to hem — do NOT alter upper body.",
            suit: "Both upper and lower body as a coordinated set — preserve face, hands and shoes.",
          };
          const regionClause = typeHint && regionMap[typeHint]
            ? `TARGET CLOTHING REGION (auto-detect on the person's body): ${regionMap[typeHint]}`
            : `TARGET CLOTHING REGION: Auto-detect the body area covered by the garment in INPUT 2 (dress = full torso+legs, shirt = upper body only, pants = lower body only, etc.) and replace ONLY that region. Leave every other region of clothing untouched.`;

          const prompt = [
            `Photorealistic virtual try-on edit. INPUT 1 = the real person (identity + pose source). INPUT 2 = the garment reference (${desc}).`,
            `TASK: Dress the person from INPUT 1 with the garment from INPUT 2.`,
            regionClause,
            `OLD GARMENT REMOVAL: Within the target region, fully discard the existing clothing textures, prints, seams, collars and shadows. Do NOT layer the new garment on top of the old one.`,
            `GARMENT SYNTHESIS: Reproduce INPUT 2's exact color, pattern, fabric texture, weave, sheen, neckline, sleeves, hem length, buttons, zippers, embroidery and silhouette. Warp realistically around shoulders, chest, waist, hips, arms and legs with natural folds, creases, drape weight and gravity-correct wrinkles. Zero clipping artifacts.`,
            `ABSOLUTE IDENTITY LOCK: Face, eyes, nose, mouth, lips, jawline, skin tone, freckles, hair, age, gender expression and exact facial expression remain 100% identical to INPUT 1. Hands, fingers, body proportions, ethnicity and pose remain identical.`,
            `CONTEXT LOCK: Background, lighting direction, color temperature, shadows, camera angle and framing remain identical to INPUT 1.`,
            `OUTPUT: One photorealistic image at INPUT 1's resolution and aspect ratio. Return ONLY the edited image.`,
          ].join(" ");

          // 1) Lovable AI primary
          if (process.env.LOVABLE_API_KEY) {
            const r = await aiEditImage(prompt, [person, garment_url]);
            if (r.ok) return json({ result_url: r.dataUrl });
            console.warn("Lovable AI tryon failed, trying Replicate:", r.error);
          }

          // 2) Replicate fallback
          const token = process.env.REPLICATE_API_TOKEN || process.env.VITE_REPLICATE_API_TOKEN;
          if (!token) {
            // 3) Hugging Face silent fallback (free tier)
            const hf = await hfGenerateImage(prompt);
            if (hf.ok) return json({ result_url: hf.dataUrl, fallback: "hf" });
            return json({ fallback: true, error: friendlyAiError() });
          }

          const model = process.env.REPLICATE_TRYON_MODEL || "black-forest-labs/flux-kontext-pro";
          const create = await fetch(
            `https://api.replicate.com/v1/models/${model}/predictions`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait" },
              body: JSON.stringify({
                input: { input_image: person, image_reference: garment_url, prompt, output_format: "jpg", safety_tolerance: 2 },
              }),
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
          console.error("/api/tryon failed:", e);
          return json({ error: e instanceof Error ? e.message : String(e), fallback: true });
        }
      },
    },
  },
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
}
