"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyLogin } from "@/lib/auth/login";
import { setSession } from "@/lib/auth/session";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/auth/rate-limit";

export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0].trim() ??
    headerStore.get("x-real-ip") ??
    "unknown";

  const { allowed, retryAfterSeconds } = checkLoginRateLimit(ip);
  if (!allowed) {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return { error: `For mange forsøg. Prøv igen om ${minutes} minut${minutes !== 1 ? "ter" : ""}.` };
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await verifyLogin(prisma, email, password);

  if (!user) {
    return { error: "Forkert email eller adgangskode." };
  }

  resetLoginRateLimit(ip);
  await setSession(user.id);
  redirect("/dashboard");
}
