import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines and merges CSS class names using clsx and tailwind-merge.
 * Ensures clean className resolution without duplicate Tailwind classes.
 * 
 * @param inputs - Array of class names or conditional class objects.
 * @returns Combined string of classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
