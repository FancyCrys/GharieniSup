import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";
import { ALLOWED_TYPES, MAX_FILE_MB } from "@/lib/files";

export const dynamic = "force-dynamic";

// Issues short-lived tokens so the browser uploads straight to Vercel Blob
// (avoids the 4.5 MB request limit on serverless functions).
export async function POST(req) {
  const body = await req.json();
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes: MAX_FILE_MB * 1024 * 1024,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message || "Upload failed." }, { status: 400 });
  }
}
