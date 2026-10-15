import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { MAX_FILE_MB, blobToken, isAllowedType, uploadsEnabled } from "@/lib/files";

export const dynamic = "force-dynamic";

// The browser posts one file at a time; the server saves it to Vercel Blob.
// Server-side put() works with both keyless (OIDC) stores and static tokens.
export async function POST(req) {
  if (!uploadsEnabled()) {
    return NextResponse.json(
      { error: "File uploads aren't set up yet. Remove the attachments to submit now." },
      { status: 503 }
    );
  }

  let file;
  try {
    const form = await req.formData();
    file = form.get("file");
  } catch {
    return NextResponse.json({ error: "Couldn't read the file. It may be too large." }, { status: 400 });
  }

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  if (!isAllowedType(file.type, file.name)) {
    return NextResponse.json({ error: `"${file.name}" isn't a supported file type.` }, { status: 400 });
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `"${file.name}" is over ${MAX_FILE_MB} MB.` }, { status: 400 });
  }

  const safeName = (file.name || "file").replace(/[^\w.\-]+/g, "_").slice(-120);
  const token = blobToken();
  try {
    const blob = await put(`tickets/${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type || "application/octet-stream",
      ...(token ? { token } : {}),
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[upload] put failed:", err);
    return NextResponse.json({ error: `Upload failed: ${err.message || err}` }, { status: 500 });
  }
}
