/**
 * Cache learning notes + question packs for offline practice.
 */

import { putRecord, getRecord, getAllRecords, deleteRecord } from "./storage";
import type { CachedNote, CachedQuestionPack } from "./types";

export async function cacheNote(note: Omit<CachedNote, "cachedAt">) {
  const row: CachedNote = { ...note, cachedAt: new Date().toISOString() };
  await putRecord("notes", row);
  return row;
}

export async function getCachedNote(id: string) {
  return getRecord<CachedNote>("notes", id);
}

export async function listCachedNotes() {
  return getAllRecords<CachedNote>("notes");
}

export async function cacheQuestionPack(
  pack: Omit<CachedQuestionPack, "cachedAt">
) {
  const row: CachedQuestionPack = {
    ...pack,
    id: pack.packId,
    cachedAt: new Date().toISOString(),
  } as CachedQuestionPack & { id: string };
  // storage keyPath is id
  await putRecord("packs", { ...row, id: pack.packId });
  return row;
}

export async function getCachedQuestionPack(packId: string) {
  return getRecord<CachedQuestionPack & { id: string }>("packs", packId);
}

export async function listCachedQuestionPacks() {
  return getAllRecords<CachedQuestionPack & { id: string }>("packs");
}

export async function removeCachedPack(packId: string) {
  await deleteRecord("packs", packId);
}

export async function removeCachedNote(id: string) {
  await deleteRecord("notes", id);
}
