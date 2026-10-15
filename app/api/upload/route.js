import { NextResponse } from "next/server";
import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned } from "@vercel/blob/client";
import { ALLOWED_TYPES, MAX_FILE_MB, blobToken, uploadsEnabled } from "@/lib/files";

export const dynamic = "force-dynamic";

// Hands the browser a short-lived presigned URL so the file goes straight to
// Vercel Blob. Works with new keyless (OIDC) stores and with a static token.
export async function POST(req) {
  if (!uploadsEnabled()) {
    return NextResponse.json(
      { error: "File uploads aren't set up yet. Please submit without attachments for now." },
      { status: 503 }
    );
  }
  const body = await req.json();
  const token = blobToken();
  try {
    const result = await handleUploadPresigned({
      body,
      request: req,
      getSignedToken: async (pathname) => ({
        token: await issueSignedToken({
          pathname,
          operations: ["put"],
          maximumSizeInBytes: MAX_FILE_MB * 1024 * 1024,
          validUntil: Date.now() + 15 * 60 * 1000,
          ...(token ? { token } : {}),
        }),
        urlOptions: {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_MB * 1024 * 1024,
          validUntil: Date.now() + 10 * 60 * 1000,
          addRandomSuffix: true,
          allowOverwrite: false,
        },
      }),
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[upload] presign failed:", err);
    return NextResponse.json({ error: err.message || "Upload failed." }, { status: 400 });
  }
}

// Lets the form explain *why* an upload failed.
export async function GET() {
  return NextResponse.json({ configured: uploadsEnabled() });
}
