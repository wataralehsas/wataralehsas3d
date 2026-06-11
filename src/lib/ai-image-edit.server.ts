// تحرير الصور بالذكاء الاصطناعي عبر بوّابة Lovable AI (Gemini Nano Banana 2)
// لا يحتاج Replicate — يستخدم رصيد Lovable AI المُعتمد تلقائياً للمشروع.

type ChatPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type AiEditResult =
  | { ok: true; dataUrl: string }
  | { ok: false; status: number; error: string };

/**
 * يستدعي نموذج تحرير صور متعدد الوسائط ويُعيد صورة data:URL.
 * @param prompt تعليمات التحرير بالإنجليزية للحصول على دقة أعلى
 * @param images صورة واحدة أو أكثر كـ data:URL أو روابط https
 */
export async function aiEditImage(
  prompt: string,
  images: string[],
): Promise<AiEditResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { ok: false, status: 500, error: "LOVABLE_API_KEY missing" };

  const parts: ChatPart[] = [{ type: "text", text: prompt }];
  for (const img of images) {
    if (img) parts.push({ type: "image_url", image_url: { url: img } });
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [{ role: "user", content: parts }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: text || `HTTP ${res.status}` };
  }

  const j = (await res.json()) as {
    choices?: { message?: { images?: { image_url?: { url?: string } }[]; content?: string } }[];
  };
  const msg = j.choices?.[0]?.message;
  const url = msg?.images?.[0]?.image_url?.url;
  if (url) return { ok: true, dataUrl: url };

  // بعض الإصدارات تُعيد الصورة كنص data:URL داخل content
  const content = msg?.content ?? "";
  const match = /data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/.exec(content);
  if (match) return { ok: true, dataUrl: match[0] };

  return { ok: false, status: 502, error: "no image returned" };
}
