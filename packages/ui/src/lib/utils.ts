import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines and merges CSS class names using clsx semantics and resolves 
 * Tailwind CSS class conflicts via twMerge (tailwind-merge).
 * 
 * @param inputs - A variadic array of ClassValue inputs representing conditional class names, objects, or arrays.
 * @returns A single string of resolved class names with resolved conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
