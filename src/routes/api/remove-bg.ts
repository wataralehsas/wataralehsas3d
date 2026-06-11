import { createFileRoute } from "@tanstack/react-router";
import { getLovableApiKey } from "@/lib/ai-gateway.server";

/**
 * Background removal via Lovable AI Gateway (image edit endpoint).
 * Accepts multipart/form-data with field "image".
 * Returns PNG bytes with transparent background.
 */
export const Route = createFileRoute("/api/remove-bg")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const key = getLovableApiKey();
          const form = await request.formData();
          const file = form.get("image");
          if (!(file instanceof File)) {
            return new Response("image file required", { status: 400 });
          }
          if (file.size > 8 * 1024 * 1024) {
            return new Response("الصورة كبيرة جداً (الحد الأقصى 8MB)", { status: 413 });
          }

          // Convert to base64 data URL
          const buf = await file.arrayBuffer();
          const base64 = Buffer.from(buf).toString("base64");
          const mime = file.type || "image/png";
          const dataUrl = `data:${mime};base64,${base64}`;

          // Use chat completions with image input for background removal request
          // Lovable Gateway image edit endpoint:
          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/images/edits",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-pro-image-preview",
                prompt:
                  "Isolate the main product/subject. Remove the entire background completely so the subject sits on a fully transparent background. Keep the subject sharp, clean edges, no shadows, no other objects, no text. Output PNG with alpha.",
                image: [dataUrl],
                n: 1,
                response_format: "b64_json",
                transparent_background: true,
              }),
            }
          );

          if (!upstream.ok) {
            const txt = await upstream.text();
            console.error("remove-bg upstream:", upstream.status, txt);
            if (upstream.status === 429)
              return new Response("ضغط مرتفع على الذكاء الاصطناعي، حاول بعد قليل", { status: 429 });
            if (upstream.status === 402)
              return new Response("رصيد الذكاء الاصطناعي مستهلك", { status: 402 });
            return new Response("فشلت معالجة الصورة", { status: 500 });
          }

          const json = (await upstream.json()) as {
            data?: { b64_json?: string; url?: string }[];
          };
          const item = json.data?.[0];
          if (!item) return new Response("لم تُرجع المعالجة أي صورة", { status: 500 });

          let bytes: ArrayBuffer;
          if (item.b64_json) {
            bytes = Buffer.from(item.b64_json, "base64").buffer.slice(0) as ArrayBuffer;
          } else if (item.url) {
            const r = await fetch(item.url);
            bytes = await r.arrayBuffer();
          } else {
            return new Response("استجابة غير متوقعة", { status: 500 });
          }

          return new Response(bytes, {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "no-store",
            },
          });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "internal error";
          console.error("/api/remove-bg error:", msg);
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});
