import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, with later Tailwind utilities winning over earlier ones.
 * Used by every shadcn component and safe to use in app code too.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
