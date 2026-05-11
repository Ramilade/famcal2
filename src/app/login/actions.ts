"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyLogin } from "@/lib/auth/login";
import { setSession } from "@/lib/auth/session";

export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await verifyLogin(prisma, email, password);

  if (!user) {
    return { error: "Forkert email eller adgangskode." };
  }

  await setSession(user.id);
  redirect("/");
}
