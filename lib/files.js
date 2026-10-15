export const MAX_FILES = 5;
export const MAX_FILE_MB = 25;
export const ALLOWED_TYPES = [
  "image/*",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
export const ACCEPT_ATTR = "image/*,video/mp4,video/quicktime,.pdf,.txt,.csv,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

export function isAllowedType(type) {
  if (!type) return false;
  return ALLOWED_TYPES.some((t) => (t.endsWith("/*") ? type.startsWith(t.slice(0, -1)) : type === t));
}

export function uploadsEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isBlobUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}
