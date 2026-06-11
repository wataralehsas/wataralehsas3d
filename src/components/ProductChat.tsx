import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, Sparkles } from "lucide-react";
import type { Design } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

export function ProductChat({
  open,
  onClose,
  design,
}: {
  open: boolean;
  onClose: () => void;
  design: Design;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: `أهلاً! اسألني أي شيء عن "${design.title}" — السعر، المواصفات، أو طريقة التركيب.`,
        },
      ]);
    }
  }, [open, design.title, messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!open) return null;

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          productContext: {
            name: design.title,
            
            category: design.type,
            price: design.price,
          },
        }),
      });
      if (!res.ok) {
        if (res.status === 429) throw new Error("ضغط مرتفع، حاول بعد قليل");
        if (res.status === 402) throw new Error("رصيد الذكاء الاصطناعي مستهلك");
        throw new Error(await res.text());
      }
      const data = (await res.json()) as { text: string };
      setMessages([...next, { role: "assistant", content: data.text }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "تعذّر الاتصال";
      setMessages([...next, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-5">
      <div className="flex h-[85vh] w-full flex-col rounded-t-3xl bg-card shadow-soft sm:h-[600px] sm:max-w-md sm:rounded-3xl border border-border">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">سؤال عن: {design.title}</p>
              <p className="text-[11px] text-muted-foreground">المساعد يرد بمعلومات هذا المنتج فقط</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-end">
              <div className="rounded-2xl bg-muted px-3 py-2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-border p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="اسأل عن المنتج..."
            className="flex-1 rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
