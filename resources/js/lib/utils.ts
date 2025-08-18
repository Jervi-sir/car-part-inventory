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
