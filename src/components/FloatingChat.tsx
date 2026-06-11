import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { useLocation } from "@tanstack/react-router";

type Msg = { role: "user" | "assistant"; content: string };

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "مرحباً! أنا مساعد وتر الإحساس. اسألني عن أي تصميم أو خدمة طباعة جدارية وسأجيبك بناءً على معلومات المنتجات والأسعار لدينا.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Hide on product page (it has its own contextual chat)
  if (location.pathname.startsWith("/product/")) return null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
        body: JSON.stringify({ messages: next }),
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
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed left-5 z-30 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft transition hover:scale-105 ${
          open ? "opacity-0 pointer-events-none" : "animate-float"
        }`}
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
        aria-label="فتح المحادثة"
      >
        <MessageCircle className="size-5" />
        <span className="hidden sm:inline">اسأل المساعد</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-start bg-black/40 backdrop-blur-sm sm:items-end sm:justify-start sm:p-5">
          <div className="flex h-[85vh] w-full flex-col rounded-t-3xl bg-card shadow-soft sm:h-[600px] sm:max-w-md sm:rounded-3xl border border-border">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">مساعد وتر الإحساس</p>
                  <p className="text-[11px] text-muted-foreground">يجيب عن المنتجات والأسعار فقط</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
                >
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
                placeholder="اكتب سؤالك..."
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
      )}
    </>
  );
}
