import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type UploadFileInput = {
  data: Buffer;
  contentType: string;
  extension?: string;
};

export interface Storage {
  uploadFile(input: UploadFileInput): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getFileUrl(key: string, contentType?: string): string;
  readFile(key: string): Promise<Buffer>;
}

const storageRoot = process.env.STORAGE_DIR?.trim() || path.join(process.cwd(), "storage", "uploads");

function safeKey(key: string) {
  const normalized = path.posix.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  if (!normalized || normalized.startsWith("/") || normalized.includes("..")) {
    throw new Error("Invalid storage key.");
  }
  return normalized;
}

export const localStorage: Storage = {
  async uploadFile({ data, contentType, extension = "bin" }) {
    const key = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension.replace(/[^a-z0-9]/gi, "") || "bin"}`;
    const filePath = path.join(storageRoot, safeKey(key));
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    void contentType;
    return key;
  },
  async deleteFile(key) {
    try {
      await unlink(path.join(storageRoot, safeKey(key)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  },
  getFileUrl(key, contentType) {
    const type = contentType ? `&type=${encodeURIComponent(contentType)}` : "";
    return `/api/files?key=${encodeURIComponent(safeKey(key))}${type}`;
  },
  async readFile(key) {
    return readFile(path.join(storageRoot, safeKey(key)));
  },
};

const s3Bucket = process.env.S3_BUCKET?.trim();

function createS3Storage(bucket: string): Storage {
  const client = new S3Client({
    region: process.env.S3_REGION?.trim() || "auto",
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" },
  });
  return {
    async uploadFile({ data, contentType, extension = "bin" }) {
      const key = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension.replace(/[^a-z0-9]/gi, "") || "bin"}`;
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: safeKey(key), Body: data, ContentType: contentType }));
      return key;
    },
    async deleteFile(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: safeKey(key) }));
    },
    getFileUrl: localStorage.getFileUrl,
    async readFile(key) {
      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: safeKey(key) }));
      if (!result.Body) throw new Error("File kosong.");
      return Buffer.from(await result.Body.transformToByteArray());
    },
  };
}

// Kalau S3_BUCKET diisi, file disimpan di cloud; kalau tidak, tetap ke disk lokal (untuk development).
export const storage: Storage = s3Bucket ? createS3Storage(s3Bucket) : localStorage;
