// Change this to your VPS address — e.g. https://api.yourdomain.com or http://YOUR_VPS_IP:3001
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function getToken() {
  return localStorage.getItem("mv_token");
}

export function setToken(t) {
  localStorage.setItem("mv_token", t);
}

export function clearToken() {
  localStorage.removeItem("mv_token");
}

export function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

export async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function streamUrl(filename) {
  return `${API_BASE}/api/admin/stream/${filename}?token=${getToken()}`;
}
