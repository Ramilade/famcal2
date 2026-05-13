import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPrimaryMembership } from "@/lib/family/membership";
import { AddMemberForm } from "./add-member-form";
import { InviteSection } from "./invite-section";
import { CalendarLinkInput } from "./calendar-link-input";
import { BackgroundPicker } from "./background-picker";
import { removeMemberAction, updateMemberColorAction } from "./actions";

const MEMBER_COLORS = [
  "#3B82F6", "#22C55E", "#A855F7", "#EF4444",
  "#F97316", "#EC4899", "#14B8A6", "#EAB308",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function FamilyPage() {
  const userId = await requireUserId();

  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) redirect("/login");

  const membership = await getPrimaryMembership(prisma, userId);

  if (!membership) {
    return (
      <main className="app-shell">
        <p>Du er ikke medlem af en familie endnu.</p>
      </main>
    );
  }

  const isAdmin = membership.role === "admin";

  const [family, familyMembers] = await Promise.all([
    prisma.family.findUnique({ where: { id: membership.familyId }, select: { name: true, calendarToken: true, backgroundUrl: true } }),
    prisma.familyMember.findMany({
      where: { familyId: membership.familyId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <main className="app-shell">
      <div className="app-topbar">
        <Link href="/" className="app-logo">
          FamCal
        </Link>
        <div className="app-topbar-actions">
          <Link href="/dashboard" className="btn-ghost">← Forside</Link>
          <Link href="/" className="btn-ghost">Kalender</Link>
          <Link href="/profile" className="btn-ghost">Profil</Link>
          <form action="/logout" method="post">
            <button type="submit" className="btn-ghost">
              Log ud
            </button>
          </form>
        </div>
      </div>

      <section className="family-card">
        <div className="family-header">
          <h2 className="family-name">{family?.name ?? "Familie"}</h2>
          <span className="family-member-count">
            {familyMembers.length}{" "}
            {familyMembers.length === 1 ? "medlem" : "medlemmer"}
          </span>
        </div>

        <div className="family-members-list">
          {familyMembers.map((m) => (
            <div key={m.id} className="family-member-row">
              <span
                className="family-member-av"
                style={{ background: m.user.defaultColor }}
              >
                {initials(m.user.name)}
              </span>
              <div className="family-member-info">
                <span className="family-member-name">{m.user.name}</span>
                <span className="family-member-email">{m.user.email}</span>
              </div>
              <span
                className={`family-role-badge${m.role === "admin" ? " family-role-badge--admin" : ""}`}
              >
                {m.role === "admin" ? "Admin" : "Medlem"}
              </span>

              {(isAdmin || m.userId === userId) && (
                <form action={updateMemberColorAction} className="member-color-form">
                  <input type="hidden" name="userId" value={m.userId} />
                  <input type="hidden" name="familyId" value={membership.familyId} />
                  {MEMBER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="submit"
                      name="color"
                      value={c}
                      className={`color-swatch-sm${m.user.defaultColor === c ? " color-swatch-sm--active" : ""}`}
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                </form>
              )}

              {isAdmin && m.userId !== userId && (
                <form action={removeMemberAction}>
                  <input type="hidden" name="familyMemberId" value={m.id} />
                  <button type="submit" className="btn-remove-member">
                    Fjern
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>

        {isAdmin && (
          <>
            <div className="family-add-wrap">
              <h3 className="family-add-title">Tilføj familiemedlem</h3>
              <AddMemberForm familyId={membership.familyId} />
            </div>
            <InviteSection familyId={membership.familyId} />
          </>
        )}

        <div className="family-add-wrap">
          <h3 className="family-add-title">Kalenderbaggrund</h3>
          <p className="invite-link-note" style={{ marginBottom: 12 }}>
            Alle familiemedlemmer kan vælge en baggrund for kalenderen.
          </p>
          <BackgroundPicker
            currentBackground={family?.backgroundUrl ?? null}
            familyId={membership.familyId}
          />
        </div>

        {family?.calendarToken && (
          <div className="family-add-wrap">
            <h3 className="family-add-title">Kalender-abonnement</h3>
            <p className="invite-link-note" style={{ marginBottom: 8 }}>
              Kopiér dette link til iPhone Kalender, Google Calendar eller Outlook for automatisk synkronisering.
            </p>
            <div className="invite-link-wrap">
              <CalendarLinkInput url={`${process.env.APP_URL ?? ""}/api/ical/${family.calendarToken}`} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
