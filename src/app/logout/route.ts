import { redirect } from "next/navigation";
import { clearSession } from "@/lib/auth/session";

export async function POST() {
  await clearSession();
  redirect("/login");
}
