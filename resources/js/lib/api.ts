import axios from "axios";

export const api = axios.create({
  baseURL: "/",               // same origin
  withCredentials: true,      // send session cookies
  headers: { "Accept": "application/json" },
});

// Sanctum/XSRF config
api.defaults.xsrfCookieName = "XSRF-TOKEN";
api.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

let csrfReady = false;
async function ensureCsrf() {
  if (csrfReady) return;
  await api.get("/sanctum/csrf-cookie"); // primes XSRF-TOKEN cookie
  csrfReady = true;
}

api.interceptors.request.use(async (config) => {
  await ensureCsrf();
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const { response, config } = error || {};
    if (response?.status === 419 && !config.__retried) {
      // Page Expired → refresh CSRF then retry once
      csrfReady = false;
      await ensureCsrf();
      config.__retried = true;
      return api.request(config);
    }
    if (response?.status === 401) {
      // Not authenticated → send to login
      window.location.href = "/login";
      return;
    }
    throw error;
  }
);

// Small helpers
export async function getJSON<T>(url: string, params?: any) {
  const { data } = await api.get<T>(url, { params });
  return data;
}

export async function sendJSON<T>(url: string, method: "POST"|"PUT"|"PATCH"|"DELETE", body?: any) {
  const { data } = await api.request<T>({ url, method, data: body });
  return data;
}
