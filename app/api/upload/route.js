import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";
import { ALLOWED_TYPES, MAX_FILE_MB, blobToken } from "@/lib/files";

export const dynamic = "force-dynamic";

// Issues short-lived tokens so the browser uploads straight to Vercel Blob
// (avoids the 4.5 MB request limit on serverless functions).
export async function POST(req) {
  const token = blobToken();
  if (!token) {
    return NextResponse.json(
      { error: "File uploads aren't set up yet. Please submit without attachments for now." },
      { status: 503 }
    );
  }
  const body = await req.json();
  try {
    const result = await handleUpload({
      body,
      request: req,
      token,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes: MAX_FILE_MB * 1024 * 1024,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[upload] handleUpload failed:", err);
    return NextResponse.json({ error: err.message || "Upload failed." }, { status: 400 });
  }
}

// Lets the form explain *why* an upload failed (the Blob SDK hides the server's message).
export async function GET() {
  return NextResponse.json({ configured: Boolean(blobToken()) });
}
