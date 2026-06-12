import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind CSS class names safely, resolving conflicts.
 * Combines clsx (conditional logic) with tailwind-merge (deduplication).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
