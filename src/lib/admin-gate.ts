import { SITE_CONFIG } from "./site-config";

const KEY = "watar_admin_ok";

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function tryLogin(pw: string): boolean {
  if (pw === SITE_CONFIG.adminPassword) {
    window.localStorage.setItem(KEY, "1");
    return true;
  }
  return false;
}

export function logoutAdmin() {
  window.localStorage.removeItem(KEY);
}
