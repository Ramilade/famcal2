let started = false;

export function startReminderScheduler(): void {
  if (started) return;
  started = true;

  const run = async () => {
    try {
      const { checkAndSendReminders } = await import("./check");
      await checkAndSendReminders();
    } catch (err) {
      console.error("[reminders] check failed:", err);
    }
    try {
      const { checkAndSendDailyDigest } = await import("./daily-digest");
      await checkAndSendDailyDigest();
    } catch (err) {
      console.error("[reminders] daily digest failed:", err);
    }
  };

  run(); // run immediately on start
  setInterval(run, 60_000); // then every minute
}
