// تسجيل آمن لـ Service Worker — لا يعمل في معاينة Lovable أو إطار iframe.
export function registerImageSW() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const host = window.location.hostname;
  const isPreview =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" || host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev");
  const inIframe = window.self !== window.top;
  const killed = new URL(window.location.href).searchParams.get("sw") === "off";
  const isDev = !import.meta.env.PROD;

  if (isDev || isPreview || inIframe || killed) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => { if (r.active?.scriptURL.endsWith("/sw.js")) r.unregister(); });
    }).catch(() => {});
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
