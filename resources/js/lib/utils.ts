import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}


export function getInitials(fullName: string) {
  if (!fullName) return "";
  return fullName
    .split(" ")                     // split into words
    .filter(Boolean)                // remove empty parts
    .map(word => word[0].toUpperCase()) // take first letter of each
    .slice(0, 2)                    // keep max 2 letters
    .join("");
}


export function toDateTimeLocal(value?: string | null): string {
  if (!value) return "";
  // value can be "2025-08-21 10:15:00" or ISO "2025-08-21T10:15:00.000000Z"
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    // fallback: replace space with T and try
    const norm = value.replace(" ", "T");
    const d2 = new Date(norm);
    if (Number.isNaN(d2.getTime())) return "";
    return d2.toISOString().slice(0,16);
  }
  // toISOString is UTC; we want local. Build local manually:
  const pad = (n:number)=>String(n).padStart(2,"0");
  const yyyy = d.getFullYear();
  const mm   = pad(d.getMonth()+1);
  const dd   = pad(d.getDate());
  const hh   = pad(d.getHours());
  const mi   = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function fromDateTimeLocalToSql(v?: string): string | undefined {
  // v like "2025-08-21T10:15" -> "2025-08-21 10:15:00"
  if (!v) return undefined;
  return v.replace("T"," ") + ':00';
}

export function normalizeDateTime(v?: string | null): string | undefined {
  if (!v) return undefined;
  // If user only picked the date part (e.g. "2025-08-21"), append midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return v + " 00:00:00";
  }
  // If it's datetime-local style (2025-08-21T14:30), convert to SQL
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) {
    return v.replace("T", ":") + ":00"; // -> "2025-08-21 14:30:00"
  }
  return v;
}
