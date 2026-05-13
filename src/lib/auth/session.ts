import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "famcal_session";

function sign(userId: string): string {
  const secret = process.env.AUTH_SECRET!;
  const sig = createHmac("sha256", secret).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

function verify(value: string): string | null {
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const userId = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac("sha256", process.env.AUTH_SECRET!).update(userId).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
  } catch {
    return null;
  }
  return userId;
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUserId() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return verify(raw);
}

export async function requireUserId() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  return userId;
}
