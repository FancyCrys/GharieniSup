export const MAX_FILES = 5;
export const MAX_FILE_MB = 4; // Vercel functions accept request bodies up to 4.5 MB
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

const ALLOWED_EXT = /\.(png|jpe?g|gif|webp|heic|heif|bmp|svg|mp4|mov|pdf|txt|csv|zip|docx?|xlsx?|pptx?)$/i;

export function isAllowedType(type, name = "") {
  if (type && ALLOWED_TYPES.some((t) => (t.endsWith("/*") ? type.startsWith(t.slice(0, -1)) : type === t))) {
    return true;
  }
  // Some browsers/OSes send an empty or generic type for Office files; fall back to the extension.
  return (!type || type === "application/octet-stream") && ALLOWED_EXT.test(name);
}

// Vercel normally names this BLOB_READ_WRITE_TOKEN, but a custom prefix
// chosen when connecting the store changes it (e.g. MYSTORE_READ_WRITE_TOKEN).
export function blobToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const key = Object.keys(process.env).find(
    (k) => k.endsWith("READ_WRITE_TOKEN") && String(process.env[k]).startsWith("vercel_blob_rw_")
  );
  return key ? process.env[key] : undefined;
}

export function uploadsEnabled() {
  return Boolean(blobToken() || process.env.BLOB_STORE_ID);
}

export function isBlobUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

// Names only (never values) of env vars that look Blob-related, for the admin diagnostic.
export function blobEnvNames() {
  return Object.keys(process.env).filter((k) => /BLOB/i.test(k)).sort();
}
