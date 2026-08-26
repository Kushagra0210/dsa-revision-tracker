type DigestEmail = {
  to: string;
  dueToday: number;
  overdue: number;
  completedToday: number;
  dashboardUrl: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendDigestEmail(email: DigestEmail): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  const lines: string[] = [];
  if (email.overdue > 0) lines.push(`<li><strong>${email.overdue}</strong> overdue revision(s)</li>`);
  if (email.dueToday > 0) lines.push(`<li><strong>${email.dueToday}</strong> problem(s) due today</li>`);
  if (lines.length === 0 && email.completedToday > 0) {
    lines.push(`<li>All done — you completed <strong>${email.completedToday}</strong> revision(s) today. 🎉</li>`);
  }
  if (lines.length === 0) return false;

  const html = `
    <div style="font-family:sans-serif;max-width:480px">
      <h2>Your DSA revisions for today</h2>
      <ul>${lines.join("")}</ul>
      <p><a href="${email.dashboardUrl}">Open the tracker →</a></p>
    </div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM_EMAIL ?? "DSA Revise <onboarding@resend.dev>",
        to: [email.to],
        subject:
          email.overdue + email.dueToday > 0
            ? `${email.overdue + email.dueToday} DSA revision(s) waiting`
            : "Your DSA revisions are done for today",
        html,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
