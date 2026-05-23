/**
 * Standard API response interfaces
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FileInfo {
  name: string;
  size: string;
  createdAt: Date;
  fileUrl: string;
}
