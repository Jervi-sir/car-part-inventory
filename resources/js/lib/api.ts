import axios from "axios";

const api = axios.create({
  baseURL: "/",                 // same-origin (adjust if your API is on a subdomain)
  withCredentials: true,        // send/receive cookies
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  },
  xsrfCookieName: "XSRF-TOKEN", // Laravel's default cookie name
  xsrfHeaderName: "X-XSRF-TOKEN",
});

let csrfOnce: Promise<void> | null = null;
async function ensureCsrfCookie() {
  if (typeof document !== "undefined" && document.cookie.includes("XSRF-TOKEN=")) return;
  if (!csrfOnce) {
    csrfOnce = api.get("/sanctum/csrf-cookie", { withCredentials: true }).then(() => {});
  }
  await csrfOnce;
}

api.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toUpperCase();
  if (method !== "GET") {
    await ensureCsrfCookie();
  }
  return config;
});

export default api;
