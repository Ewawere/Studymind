/**
 * Object storage — S3-compatible (AWS S3, Cloudflare R2, MinIO, GCS interop).
 * Falls back to local /tmp in development when S3 is not configured.
 */

import { platformConfig } from "./config";
import { log } from "./logging";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export interface PutObjectResult {
  key: string;
  url: string;
  provider: "s3" | "local";
}

export async function putObject(opts: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
}): Promise<PutObjectResult> {
  const { s3 } = platformConfig;

  if (s3.bucket && s3.accessKeyId && s3.secretAccessKey) {
    try {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region: s3.region,
        endpoint: s3.endpoint || undefined,
        credentials: {
          accessKeyId: s3.accessKeyId,
          secretAccessKey: s3.secretAccessKey,
        },
        forcePathStyle: !!s3.endpoint,
      });

      await client.send(
        new PutObjectCommand({
          Bucket: s3.bucket,
          Key: opts.key,
          Body: opts.body,
          ContentType: opts.contentType,
        })
      );

      const url = s3.publicBaseUrl
        ? `${s3.publicBaseUrl.replace(/\/$/, "")}/${opts.key}`
        : `s3://${s3.bucket}/${opts.key}`;

      return { key: opts.key, url, provider: "s3" };
    } catch (e) {
      log.error("storage.s3_failed", {
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  }

  // Local fallback
  const dir = path.join(process.cwd(), ".data", "uploads");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, opts.key.replace(/\//g, "_"));
  await writeFile(filePath, opts.body);
  return {
    key: opts.key,
    url: `/local-uploads/${opts.key}`,
    provider: "local",
  };
}

export function storageConfigured(): boolean {
  const { s3 } = platformConfig;
  return !!(s3.bucket && s3.accessKeyId && s3.secretAccessKey);
}
