import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAI } from "@/lib/ai-gateway.server";
import { supabase } from "@/integrations/supabase/client";

type ChatBody = {
  messages: { role: "user" | "assistant"; content: string }[];
  productContext?: {
    name: string;
    description: string | null;
    category: string | null;
    price: number | null;
  };
};

async function fetchAllProducts() {
  const { data } = await supabase
    .from("products")
    .select("id, name, description, category, price")
    .limit(100);
  return data ?? [];
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as ChatBody;
          if (!Array.isArray(body.messages) || body.messages.length === 0) {
            return new Response("messages required", { status: 400 });
          }

          let knowledge = "";
          if (body.productContext) {
            const p = body.productContext;
            knowledge = `معلومات المنتج المسؤول عنه فقط:
- الاسم: ${p.name}
- الفئة: ${p.category ?? "غير محددة"}
- الوصف: ${p.description ?? "لا يوجد وصف"}
- السعر: ${p.price != null ? `${p.price}` : "غير محدد — اطلب التواصل لمعرفته"}`;
          } else {
            const products = await fetchAllProducts();
            knowledge =
              products.length === 0
                ? "لا توجد منتجات حالياً في المعرض."
                : "المنتجات المتاحة (ID — اسم — فئة — وصف):\n" +
                  products
                    .map(
                      (p) =>
                        `• [/product/${p.id}] ${p.name}${p.category ? ` — ${p.category}` : ""}${
                          p.description ? ` — ${p.description}` : ""
                        }`
                    )
                    .join("\n");
          }

          const system = `أنت "مستشار وتر الإحساس" — مساعد لخدمة طباعة الجدران الرقمية ثلاثية الأبعاد (Epson i1600، أحبار UV، جودة 8K).

قواعد صارمة:
1. تجيب فقط عن المنتجات والأسعار من "قاعدة المعرفة" أدناه.
2. أي سؤال خارج النطاق (طقس، سياسة، برمجة، أسرار الورشة، الموردين، الموظفين) ترفضه بأدب وتعيد التوجيه للمنتجات.
3. لا تخترع أسعاراً أو منتجات. لو غير موجود قل: "تواصل مع الفرع لمعرفة هذه المعلومة".
4. لا تكشف تفاصيل تقنية داخلية عن الآلات أو العمليات.
5. عند طلب توصية: حلّل وصف العميل (نوع الغرفة، الرطوبة، الذوق) واقترح ٣ تصاميم مناسبة بصيغة:
   "1. **اسم التصميم** — [اضغط لعرضه](/product/ID) — سبب التوصية"
6. اقترح بإيجاز الإعداد التقني المناسب (مثل: حبر مقاوم للرطوبة + لاصق UV) عند الحاجة دون كشف تفاصيل الآلة.
7. ردود قصيرة، عربية فصحى مبسطة، نبرة احترافية ودودة.

قاعدة المعرفة:
${knowledge}`;


          const ai = createLovableAI();
          const { text } = await generateText({
            model: ai("google/gemini-3-flash-preview"),
            system,
            messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
          });

          return Response.json({ text });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "internal error";
          console.error("/api/chat error:", msg);
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});
