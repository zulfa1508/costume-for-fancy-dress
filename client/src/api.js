import { API_URL } from "./config";

export async function api(path, options = {}, token) {
  const headers = { ...(options.headers || {}) };

  if (
    options.body &&
    typeof options.body === "object" &&
    !(options.body instanceof FormData)
  ) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API_URL + path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.error || "Request failed");

  return data;
}