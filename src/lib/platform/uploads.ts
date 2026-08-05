/**
 * Upload helpers for question media and user assets.
 */

import { putObject } from "./storage";
import { randomUUID } from "crypto";

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function uploadQuestionMedia(opts: {
  questionId: string;
  filename: string;
  contentType: string;
  body: Buffer;
}) {
  if (!ALLOWED.has(opts.contentType)) {
    throw new Error(`Unsupported content type: ${opts.contentType}`);
  }
  if (opts.body.byteLength > 8 * 1024 * 1024) {
    throw new Error("File exceeds 8MB limit");
  }

  const ext = opts.filename.split(".").pop() ?? "bin";
  const key = `questions/${opts.questionId}/${randomUUID()}.${ext}`;
  return putObject({
    key,
    body: opts.body,
    contentType: opts.contentType,
  });
}

export async function uploadImportFile(opts: {
  userId: string;
  filename: string;
  body: Buffer;
  contentType?: string;
}) {
  const key = `imports/${opts.userId}/${Date.now()}_${opts.filename}`;
  return putObject({
    key,
    body: opts.body,
    contentType: opts.contentType ?? "text/csv",
  });
}
