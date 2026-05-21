import { z } from "zod";
import * as cheerio from "cheerio";
import { fetchText } from "../lib/fetch.js";
import { predictCitation } from "./predict-citation.js";

export const auditSitemapInputSchema = {
  sitemap_url: z
    .string()
    .url()
    .describe("URL of sitemap.xml (or a sitemap index). Nested sitemaps are followed."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .default(50)
    .describe("Max URLs to score. Sitemap is sliced after parsing."),
  concurrency: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(3)
    .describe("Parallel predict_citation calls. Higher is faster but more rate-limit risk."),
};

const inputSchema = z.object(auditSitemapInputSchema);

async function parseSitemap(url: string, depth = 0): Promise<string[]> {
  if (depth > 2) return [];
  const { text } = await fetchText(url, { timeoutMs: 15_000 });
  const $ = cheerio.load(text, { xmlMode: true });
  const childSitemaps = $("sitemap > loc")
    .toArray()
    .map((el) => $(el).text().trim())
    .filter(Boolean);
  if (childSitemaps.length > 0) {
    const nested = await Promise.all(childSitemaps.map((s) => parseSitemap(s, depth + 1)));
    return nested.flat();
  }
  return $("url > loc")
    .toArray()
    .map((el) => $(el).text().trim())
    .filter(Boolean);
}

async function pool<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function auditSitemap(input: z.infer<typeof inputSchema>) {
  const parsed = inputSchema.parse(input);

  const urls = (await parseSitemap(parsed.sitemap_url)).slice(0, parsed.limit);
  if (urls.length === 0) {
    return {
      sitemap_url: parsed.sitemap_url,
      total_urls: 0,
      audited: 0,
      message: "no URLs found in sitemap",
    };
  }

  type Row =
    | { url: string; score: number; grade: string; signals: Record<string, unknown>; top_fix?: string }
    | { url: string; error: string };

  const rows: Row[] = await pool(urls, parsed.concurrency, async (url) => {
    try {
      const r = await predictCitation({ url });
      return {
        url,
        score: r.score,
        grade: r.grade,
        signals: r.signals as unknown as Record<string, unknown>,
        top_fix: r.fixes?.[0]?.suggestion,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { url, error: message };
    }
  });

  const scored = rows.filter((r): r is Extract<Row, { score: number }> => "score" in r);
  scored.sort((a, b) => a.score - b.score);

  const avg =
    scored.length > 0
      ? scored.reduce((s, r) => s + r.score, 0) / scored.length
      : 0;

  return {
    sitemap_url: parsed.sitemap_url,
    fetched_at: new Date().toISOString(),
    total_urls: urls.length,
    audited: rows.length,
    average_score: Math.round(avg),
    worst_first: scored.slice(0, 20),
    errors: rows.filter((r): r is Extract<Row, { error: string }> => "error" in r),
  };
}
