import Parser from "rss-parser";
import { createServiceRoleClient } from "@/lib/supabase/server";

const parser = new Parser();

/**
 * جامع RSS (T-043): يقرا لائحة المصادر الحية من جدول sources
 * (type='rss' و is_active=true) بدل لائحة ثابتة فالكود — زيادة مصدر
 * من Ciblage كيخدم فالدورة الجاية بلا نشر كود.
 */
export async function collectAllRssSources() {
  const supabase = createServiceRoleClient();

  const { data: sources, error } = await supabase
    .from("sources")
    .select("id, name, url")
    .eq("type", "rss")
    .eq("is_active", true);

  if (error) throw error;

  const results = [];
  for (const source of sources ?? []) {
    results.push(await collectOneSource(supabase, source));
  }
  return results;
}

async function collectOneSource(
  supabase: ReturnType<typeof createServiceRoleClient>,
  source: { id: string; name: string; url: string }
) {
  const { data: run } = await supabase
    .from("collection_runs")
    .insert({ source_id: source.id, status: "running" })
    .select()
    .single();

  try {
    const feed = await parser.parseURL(source.url);
    let itemsFound = 0;

    for (const item of feed.items) {
      const externalId = item.guid || item.link || item.title;
      if (!externalId) continue;

      const { error: upsertError } = await supabase.from("mentions").upsert(
        {
          source_id: source.id,
          external_id: externalId,
          title: item.title ?? null,
          content: item.contentSnippet ?? item.content ?? null,
          url: item.link ?? null,
          published_at: item.isoDate ?? item.pubDate ?? null,
          platform: "press",
          collector_channel: "rss",
          entry_method: "auto",
        },
        { onConflict: "source_id,external_id", ignoreDuplicates: true }
      );
      if (!upsertError) itemsFound++;
    }

    await supabase
      .from("collection_runs")
      .update({ status: "success", items_found: itemsFound, finished_at: new Date().toISOString() })
      .eq("id", run.id);

    return { source: source.name, status: "success", items: itemsFound };
  } catch (err) {
    await supabase
      .from("collection_runs")
      .update({
        status: "error",
        error_message: err instanceof Error ? err.message : String(err),
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return { source: source.name, status: "error", error: String(err) };
  }
}
