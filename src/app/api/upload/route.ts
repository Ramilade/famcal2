import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { requireUserId } from "@/lib/auth/session";

const UPLOADS_DIR = join(process.cwd(), "uploads");
const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export async function POST(request: NextRequest) {
  try {
    await requireUserId();
  } catch {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ugyldigt format" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Ingen fil" }, { status: 400 });

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Kun JPG, PNG eller WebP er tilladt" }, { status: 400 });

  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Filen er for stor (max 8 MB)" }, { status: 400 });

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(join(UPLOADS_DIR, filename), buffer);

  return NextResponse.json({ url: `/api/uploads/${filename}` });
}
