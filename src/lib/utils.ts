import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if a URL is a valid YouTube URL
 */
export function isYoutubeUrl(url: string): boolean {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/;
  return youtubeRegex.test(url);
}

/**
 * Check if a URL is a valid Google Drive URL
 */
export function isGoogleDriveUrl(url: string): boolean {
  // Match both drive.google.com/file and drive.google.com/view formats
  const googleDriveRegex = /^(https?:\/\/)?(www\.)?(drive\.google\.com)\/.+/;
  return googleDriveRegex.test(url);
}
