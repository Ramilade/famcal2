type Entry = {
  id: string;
  action: string;
  entityName: string | null;
  createdAt: Date;
  user: { name: string };
};

function label(action: string, entityName: string | null): string {
  const name = entityName ? `"${entityName}"` : "en aftale";
  if (action === "created") return `tilføjede ${name}`;
  if (action === "updated") return `opdaterede ${name}`;
  if (action === "deleted") return `slettede ${name}`;
  return action;
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "lige nu";
  if (m < 60) return `${m} min siden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} t siden`;
  const d = Math.floor(h / 24);
  return `${d} dag${d !== 1 ? "e" : ""} siden`;
}

export function ActivityFeed({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="activity-feed">
      <h3 className="activity-feed-title">Seneste aktivitet</h3>
      <div className="activity-list">
        {entries.map((e) => (
          <div key={e.id} className="activity-item">
            <span className="activity-actor">{e.user.name.split(" ")[0]}</span>
            <span className="activity-text">{label(e.action, e.entityName)}</span>
            <span className="activity-time">{timeAgo(e.createdAt)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
