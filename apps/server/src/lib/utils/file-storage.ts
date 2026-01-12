import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  originalName: string;
}

export class FileStorageService {
  private uploadDir: string;

  constructor(uploadDir: string = 'uploads/documents') {
    this.uploadDir = path.resolve(process.cwd(), uploadDir);
    this.ensureUploadDirectory();
  }

  private ensureUploadDirectory(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: File): Promise<UploadedFile> {
    const fileExtension = this.getFileExtension(file.name);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, uniqueFileName);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write file to disk
    await fs.promises.writeFile(filePath, buffer);

    return {
      fileName: uniqueFileName,
      fileSize: file.size,
      mimeType: file.type,
      fileUrl: `/uploads/documents/${uniqueFileName}`,
      originalName: file.name,
    };
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const fileName = path.basename(fileUrl);
      const filePath = path.join(this.uploadDir, fileName);
      
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  getFilePath(fileUrl: string): string {
    const fileName = path.basename(fileUrl);
    return path.join(this.uploadDir, fileName);
  }

  fileExists(fileUrl: string): boolean {
    const filePath = this.getFilePath(fileUrl);
    return fs.existsSync(filePath);
  }

  private getFileExtension(fileName: string): string {
    const ext = path.extname(fileName);
    return ext || '';
  }

  validateFileType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType);
  }

  validateFileSize(fileSize: number, maxSizeInMB: number): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return fileSize <= maxSizeInBytes;
  }
}

// Default instance
export const fileStorage = new FileStorageService();

// Allowed document types
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'text/csv',
  'text/plain',
];

// Max file size: 10MB
export const MAX_FILE_SIZE_MB = 10;
