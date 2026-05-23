import { existsSync, mkdirSync, statSync, readdirSync, unlinkSync } from 'fs';
import { join, extname, parse } from 'path';

/**
 * Format file size to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Ensure a directory exists, create if not
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get file stats with formatted info
 */
export function getFileInfo(filePath: string) {
  const stats = statSync(filePath);
  return {
    size: stats.size,
    sizeFormatted: formatFileSize(stats.size),
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
  };
}

/**
 * List files in a directory with optional extension filter
 */
export function listFiles(
  dirPath: string,
  extensions?: string[],
): { name: string; stats: ReturnType<typeof getFileInfo> }[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  return readdirSync(dirPath)
    .filter((file) => {
      if (!extensions || extensions.length === 0) return true;
      const ext = extname(file).toLowerCase();
      return extensions.includes(ext);
    })
    .map((file) => ({
      name: file,
      stats: getFileInfo(join(dirPath, file)),
    }));
}

/**
 * Delete a file if it exists
 */
export function deleteFile(filePath: string): boolean {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
    return true;
  }
  return false;
}

/**
 * Get file name without extension
 */
export function getFileNameWithoutExt(fileName: string): string {
  return parse(fileName).name;
}

/**
 * Check if file has valid extension
 */
export function hasValidExtension(
  fileName: string,
  validExtensions: string[],
): boolean {
  const ext = extname(fileName).toLowerCase();
  return validExtensions.includes(ext);
}

/**
 * Sanitizes a filename by replacing spaces and special characters
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Get the extension
  const lastDotIndex = filename.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0;

  const name = hasExtension ? filename.substring(0, lastDotIndex) : filename;
  const extension = hasExtension ? filename.substring(lastDotIndex) : '';

  // Replace spaces with underscores, remove special characters
  const sanitizedName = name
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[áàäâ]/gi, 'a') // Replace accented characters
    .replace(/[éèëê]/gi, 'e')
    .replace(/[íìïî]/gi, 'i')
    .replace(/[óòöô]/gi, 'o')
    .replace(/[úùüû]/gi, 'u')
    .replace(/[ñ]/gi, 'n')
    .replace(/[^a-zA-Z0-9_-]/g, '') // Remove any other special characters
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

  return sanitizedName + extension.toLowerCase();
}

/**
 * Generates a unique filename with timestamp
 * @param originalName - Original filename
 * @param prefix - Optional prefix
 * @returns Unique filename with timestamp
 */
export function generateUniqueFilename(
  originalName: string,
  prefix?: string,
): string {
  const sanitized = sanitizeFilename(originalName);
  const timestamp = Date.now();

  if (prefix) {
    return `${prefix}_${timestamp}_${sanitized}`;
  }

  return `${timestamp}_${sanitized}`;
}
