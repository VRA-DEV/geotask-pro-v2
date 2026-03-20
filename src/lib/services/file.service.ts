import { writeFile, mkdir, unlink, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export interface UploadResult {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  storagePath: string;
}

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  shapefile: ["application/zip", "application/x-zip-compressed"],
  all: [] as string[], // populated below
};
ALLOWED_MIME_TYPES.all = [
  ...ALLOWED_MIME_TYPES.image,
  ...ALLOWED_MIME_TYPES.document,
  ...ALLOWED_MIME_TYPES.shapefile,
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const STORAGE_DRIVER = process.env.STORAGE_DRIVER || "LOCAL";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export class FileService {
  /**
   * Validates file type against allowed mime types.
   */
  static validateMimeType(
    mimeType: string,
    category: keyof typeof ALLOWED_MIME_TYPES = "all"
  ): boolean {
    return ALLOWED_MIME_TYPES[category].includes(mimeType);
  }

  /**
   * Validates file size.
   */
  static validateSize(size: number, maxSize = MAX_FILE_SIZE): boolean {
    return size <= maxSize;
  }

  /**
   * Saves a file to local storage or S3.
   */
  static async save(
    file: File,
    directory: string,
    category: keyof typeof ALLOWED_MIME_TYPES = "all"
  ): Promise<UploadResult> {
    // Validate
    if (!this.validateMimeType(file.type, category)) {
      throw new Error(`Tipo de arquivo nao permitido: ${file.type}`);
    }

    if (!this.validateSize(file.size)) {
      throw new Error(
        `Arquivo excede o tamanho maximo de ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    const ext = path.extname(file.name) || this.getExtension(file.type);
    const filename = `${uuidv4()}${ext}`;

    if (STORAGE_DRIVER === "S3") {
      return this.saveToS3(file, directory, filename);
    }

    return this.saveToLocal(file, directory, filename);
  }

  /**
   * Saves file to local disk.
   */
  private static async saveToLocal(
    file: File,
    directory: string,
    filename: string
  ): Promise<UploadResult> {
    const dir = path.join(UPLOAD_DIR, directory);

    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const filePath = path.join(dir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return {
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url: `/api/uploads/${directory}/${filename}`,
      storagePath: filePath,
    };
  }

  /**
   * Saves file to AWS S3.
   * TODO: Implement when deploying to production.
   */
  private static async saveToS3(
    file: File,
    directory: string,
    filename: string
  ): Promise<UploadResult> {
    // Placeholder for S3 integration
    // const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    // const s3 = new S3Client({ region: process.env.AWS_REGION });
    // await s3.send(new PutObjectCommand({
    //   Bucket: process.env.AWS_S3_BUCKET,
    //   Key: `${directory}/${filename}`,
    //   Body: Buffer.from(await file.arrayBuffer()),
    //   ContentType: file.type,
    // }));

    throw new Error("S3 storage not yet configured. Set STORAGE_DRIVER=LOCAL for development.");
  }

  /**
   * Deletes a file from storage.
   */
  static async delete(filePath: string): Promise<void> {
    if (STORAGE_DRIVER === "S3") {
      // TODO: S3 delete
      return;
    }

    try {
      const fullPath = filePath.startsWith("/")
        ? path.join(UPLOAD_DIR, filePath.replace(/^\/api\/uploads\//, ""))
        : filePath;

      if (existsSync(fullPath)) {
        await unlink(fullPath);
      }
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  }

  /**
   * Gets file info from storage.
   */
  static async getInfo(filePath: string): Promise<{ size: number; exists: boolean }> {
    try {
      const stats = await stat(filePath);
      return { size: stats.size, exists: true };
    } catch {
      return { size: 0, exists: false };
    }
  }

  /**
   * Maps mime type to file extension.
   */
  private static getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "application/pdf": ".pdf",
      "application/zip": ".zip",
      "application/msword": ".doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
      "application/vnd.ms-excel": ".xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    };
    return map[mimeType] || "";
  }
}
