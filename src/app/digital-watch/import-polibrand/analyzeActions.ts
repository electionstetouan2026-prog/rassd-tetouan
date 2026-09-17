"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { analyzeMentionsBatch, isMentionAnalysisConfigured, type MentionForAnalysis } from "@/lib/ai/mentionAnalysis";

const BATCH_SIZE = 12; // محدود عمدا (وقت تنفيذ دالة Vercel محدود) — الواجهة كتعاود الاستدعاء لحد ما تسالا

export type AnalysisBatchResult = {
  configured: boolean;
  done: boolean;
  processedThisBatch: number;
  remaining: number;
};

export async function getPendingAnalysisCount(): Promise<{ configured: boolean; remaining: number; totalAnalyzed: number }> {
  const supabase = await createClient();
  const [{ count: remaining }, { count: totalAnalyzed }] = await Promise.all([
    supabase.from("polibrand_mentions").select("id", { count: "exact", head: true }).is("ai_analyzed_at", null),
    supabase.from("polibrand_mentions").select("id", { count: "exact", head: true }).not("ai_analyzed_at", "is", null),
  ]);
  return {
    configured: isMentionAnalysisConfigured(),
    remaining: remaining ?? 0,
    totalAnalyzed: totalAnalyzed ?? 0,
  };
}

export async function runMentionAiAnalysisBatch(): Promise<AnalysisBatchResult> {
  const supabase = await createClient();

  if (!isMentionAnalysisConfigured()) {
    return { configured: false, done: true, processedThisBatch: 0, remaining: 0 };
  }

  const { data: rows } = await supabase
    .from("polibrand_mentions")
    .select("id, platform, source_name, author, title, text_excerpt, quoted_excerpt, reactions, comments_count, shares, niveau")
    .is("ai_analyzed_at", null)
    .order("entry_date", { ascending: false })
    .limit(BATCH_SIZE);

  const batch = (rows ?? []) as MentionForAnalysis[];
  if (batch.length === 0) {
    return { configured: true, done: true, processedThisBatch: 0, remaining: 0 };
  }

  const results = await analyzeMentionsBatch(batch);
  const now = new Date().toISOString();

  for (const m of batch) {
    const r = results.get(m.id);
    await supabase
      .from("polibrand_mentions")
      .update({
        ai_entities: r && r.entities.length ? r.entities.join(", ") : null,
        ai_influence_score: r ? r.influence : null,
        ai_analyzed_at: now,
      })
      .eq("id", m.id);
  }

  const { count: remaining } = await supabase
    .from("polibrand_mentions")
    .select("id", { count: "exact", head: true })
    .is("ai_analyzed_at", null);

  revalidatePath("/ranking");
  return { configured: true, done: (remaining ?? 0) === 0, processedThisBatch: batch.length, remaining: remaining ?? 0 };
}
