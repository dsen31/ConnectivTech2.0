"use server";

import { createClient } from "@/lib/supabase/server";

export type CampaignMetrics = {
  campaign_id: string;
  campaign_name: string;
  sent: number;
  opened: number;
  replied: number;
  clicked: number;
  unsubscribed: number;
};

export type DailyData = {
  date: string;
  label: string;
  sent: number;
  opened: number;
  replied: number;
};

type EventRow = {
  event_type: string;
  created_at: string;
  campaign_leads: {
    campaign_id: string;
    campaigns: { id: string; name: string } | null;
  } | null;
};

export async function getAnalyticsData(): Promise<{
  campaignMetrics: CampaignMetrics[];
  dailyData: DailyData[];
  totals: Pick<CampaignMetrics, "sent" | "opened" | "replied" | "clicked" | "unsubscribed">;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("email_events")
    .select("event_type, created_at, campaign_leads(campaign_id, campaigns(id, name))");

  const events = (data ?? []) as unknown as EventRow[];

  // ── Per-campaign metrics (all time) ──────────────────────────────────────────
  const campaignMap = new Map<string, CampaignMetrics>();

  for (const e of events) {
    const cl = e.campaign_leads;
    if (!cl) continue;
    const cid = cl.campaign_id;
    const cname = cl.campaigns?.name ?? "Unknown";

    if (!campaignMap.has(cid)) {
      campaignMap.set(cid, {
        campaign_id: cid,
        campaign_name: cname,
        sent: 0,
        opened: 0,
        replied: 0,
        clicked: 0,
        unsubscribed: 0,
      });
    }

    const m = campaignMap.get(cid)!;
    if (e.event_type === "sent") m.sent++;
    else if (e.event_type === "opened") m.opened++;
    else if (e.event_type === "replied") m.replied++;
    else if (e.event_type === "clicked") m.clicked++;
    else if (e.event_type === "unsubscribed") m.unsubscribed++;
  }

  const campaignMetrics = Array.from(campaignMap.values()).sort((a, b) => b.sent - a.sent);

  // ── Daily data (last 30 days) ─────────────────────────────────────────────────
  const now = new Date();
  const dayMap = new Map<string, DailyData>();
  const dailyData: DailyData[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const entry: DailyData = { date: key, label, sent: 0, opened: 0, replied: 0 };
    dailyData.push(entry);
    dayMap.set(key, entry);
  }

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);
  cutoff.setHours(0, 0, 0, 0);

  for (const e of events) {
    const d = new Date(e.created_at);
    if (d < cutoff) continue;
    const key = e.created_at.slice(0, 10);
    const day = dayMap.get(key);
    if (!day) continue;
    if (e.event_type === "sent") day.sent++;
    else if (e.event_type === "opened") day.opened++;
    else if (e.event_type === "replied") day.replied++;
  }

  // ── Overall totals ────────────────────────────────────────────────────────────
  const totals = campaignMetrics.reduce(
    (acc, m) => ({
      sent: acc.sent + m.sent,
      opened: acc.opened + m.opened,
      replied: acc.replied + m.replied,
      clicked: acc.clicked + m.clicked,
      unsubscribed: acc.unsubscribed + m.unsubscribed,
    }),
    { sent: 0, opened: 0, replied: 0, clicked: 0, unsubscribed: 0 }
  );

  return { campaignMetrics, dailyData, totals };
}
