const csrf =
  (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

type Json = Record<string, unknown> | unknown[];

function headers(json = true) {
  return {
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    'X-CSRF-TOKEN': csrf,
    'X-Requested-With': 'XMLHttpRequest',
  };
}

export const http = {
  get: (url: string) =>
    fetch(url, {
      method: 'GET',
      headers: headers(false),
      credentials: 'same-origin',
    }),

  post: (url: string, body?: Json) =>
    fetch(url, {
      method: 'POST',
      headers: headers(),
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: (url: string, body?: Json) =>
    fetch(url, {
      method: 'PUT',
      headers: headers(),
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: (url: string) =>
    fetch(url, {
      method: 'DELETE',
      headers: headers(false),
      credentials: 'same-origin',
    }),
};
