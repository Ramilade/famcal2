import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ProfileForm } from "./profile-form";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default async function ProfilePage() {
  const userId = await requireUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, defaultColor: true, createdAt: true },
  });
  if (!user) redirect("/login");

  return (
    <main className="app-shell">
      <div className="app-topbar">
        <Link href="/dashboard" className="app-logo">FamCal</Link>
        <div className="app-topbar-actions">
          <div className="topbar-nav">
            <Link href="/dashboard" className="btn-ghost">← Forside</Link>
            <Link href="/calendar" className="btn-ghost">Kalender</Link>
            <form action="/logout" method="post">
              <button type="submit" className="btn-ghost">Log ud</button>
            </form>
          </div>
        </div>
      </div>

      <div className="profile-header">
        <span
          className="profile-avatar"
          style={{ background: user.defaultColor }}
        >
          {initials(user.name)}
        </span>
        <div>
          <h1 className="profile-name">{user.name}</h1>
          <p className="profile-email-display">{user.email}</p>
          <p className="profile-since">
            Medlem siden {new Date(user.createdAt).toLocaleDateString("da-DK", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <ProfileForm name={user.name} email={user.email} />
    </main>
  );
}
