const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_BASE = `${API_BASE_URL}/api`;

export async function apiFetch(path, options = {}, token = null) {
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}