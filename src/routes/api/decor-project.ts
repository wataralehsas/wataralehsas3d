import { createFileRoute } from "@tanstack/react-router";
import { aiEditImage } from "@/lib/ai-image-edit.server";
import { hfGenerateImage, friendlyAiError } from "@/lib/hf-fallback.server";

// إسقاط منظوري واقعي للديكور — Lovable AI أساسي + Hugging Face (FLUX.schnell) احتياطي صامت
export const Route = createFileRoute("/api/decor-project")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { room, design, design_desc, surface, embossed, placement_note, placement_mode } = (await request.json()) as {
          room: string; design: string; design_desc?: string;
          surface?: "wall" | "floor" | "ceiling"; embossed?: boolean;
          placement_note?: string;
          placement_mode?: "single-area" | "centerpiece" | "full-surface" | "feature-strip";
        };
        if (!room || !design) return json({ error: "missing inputs" }, 400);

        const target = surface === "floor" ? "floor" : surface === "ceiling" ? "ceiling" : "main visible wall";
        const desc = (design_desc || "the decorative pattern shown in the second image").trim();
        const placementText = (placement_note || "").trim();
        const placementRule = placement_mode === "centerpiece"
          ? "PLACEMENT: Apply the design as a focused centerpiece only in the requested location, keeping the rest of the target surface mostly unchanged."
          : placement_mode === "feature-strip"
            ? "PLACEMENT: Apply the design as a localized decorative strip/band only where requested, not as a full-surface fill."
            : placement_mode === "single-area"
              ? "PLACEMENT: Apply the design only to one clearly bounded chosen area of the target surface."
              : "PLACEMENT: Cover the whole selected target surface continuously and seamlessly.";
        const placementNoteClause = placementText
          ? `USER PLACEMENT NOTE: ${placementText}. Follow this placement instruction exactly while preserving real room perspective.`
          : "";
        const embossedClause = embossed
          ? `EMBOSS: Apply a tactile ~30% embossed relief — raised geometry along the pattern edges with consistent self-shadowing driven by the scene's light direction, simulating CNC/3D-printed wall panels.`
          : `Keep the surface flat and matte unless the pattern naturally implies sheen.`;

        const prompt = [
          `Architectural interior compositing for industrial UV wall-printing blueprints. INPUT 1 = the real room photo. INPUT 2 = decorative design reference (${desc}).`,
          `TASK: Project the design from INPUT 2 onto the ${target} of INPUT 1 with photoreal perspective.`,
          placementRule,
          placementNoteClause,
          `VECTOR-GRID MAPPING: Treat the design as a seamless, tileable, vector-grid-aligned pattern. Align tile edges to the surface grid; veins, motifs and repeats must continue continuously across tile boundaries with zero visible seams.`,
          `PERSPECTIVE MATRIX: Detect the room's vanishing points, surface normals and corner vectors. Bend, scale and foreshorten the design along the surface plane so vertical lines stay vertical, horizontal patterns recede toward the vanishing point, and the design wraps correctly around real corners, pillars, sockets and moldings.`,
          `RESOLUTION: Output must be razor-sharp at print resolution — crisp vein edges, no upscaling blur, no JPEG artifacts, suitable for large-format UV plotter output.`,
          `OCCLUSION & DEPTH: Place the design BEHIND any foreground furniture, lamps, plants, frames or people. Respect existing shadow casts, ambient occlusion in corners, and contact shadows under furniture.`,
          `LIGHT MATCH: Re-light the projected design with the scene's light direction, color temperature and intensity. Preserve highlights, reflections on glossy materials, and softness of shadows.`,
          embossedClause,
          `LOCK: Do NOT change room geometry, furniture, windows, doors, ceiling, floor outline, people or framing. Only the ${target} surface receives the new pattern.`,
          `OUTPUT: One photorealistic interior render, sharp, natural film grain, no watermark, no text. Return ONLY the composited image.`,
        ].join(" ");

        // 1) Lovable AI primary
        if (process.env.LOVABLE_API_KEY) {
          const r = await aiEditImage(prompt, [room, design]);
          if (r.ok) return json({ result_url: r.dataUrl });
          console.warn("Lovable AI decor failed, trying Replicate fallback:", r.status, r.error);
        }

        // 2) Replicate fallback for decor compositing
        const token = process.env.REPLICATE_API_TOKEN || process.env.VITE_REPLICATE_API_TOKEN;
        if (token) {
          const model = process.env.REPLICATE_DECOR_MODEL || "black-forest-labs/flux-kontext-pro";
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
                input: {
                  input_image: room,
                  image_reference: design,
                  prompt,
                  output_format: "jpg",
                  safety_tolerance: 2,
                },
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
              if (url) return json({ result_url: url, fallback: "replicate" });
            }
            console.warn("Replicate decor prediction did not succeed:", status);
          } else {
            console.warn("Replicate decor create failed:", pred?.detail || pred?.error || create.status);
          }
        }

        // 3) Hugging Face silent fallback
        const hf = await hfGenerateImage(prompt);
        if (hf.ok) return json({ result_url: hf.dataUrl, fallback: "hf" });

        return json({ fallback: true, error: friendlyAiError() });
      },
    },
  },
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
}
