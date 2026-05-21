import { z } from "zod";
import { predictCitation } from "./predict-citation.js";

export const compareDomainsInputSchema = {
  urls: z
    .array(z.string().url())
    .min(2)
    .max(10)
    .describe("URLs to compare side-by-side. 2-10 URLs. One is typically yours and the rest are cited competitors."),
};

const inputSchema = z.object(compareDomainsInputSchema);

export async function compareDomains(input: z.infer<typeof inputSchema>) {
  const parsed = inputSchema.parse(input);

  const rows = await Promise.all(
    parsed.urls.map(async (url) => {
      try {
        const r = await predictCitation({ url });
        return {
          url,
          score: r.score,
          grade: r.grade,
          signals: r.signals,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { url, error: message };
      }
    }),
  );

  const scored = rows.filter((r) => "score" in r) as Array<
    Extract<typeof rows[number], { score: number }>
  >;
  const signalKeys = [
    "wikipedia_linked",
    "schema_org_present",
    "llms_txt_present",
    "github_referenced",
    "reddit_referenced",
    "canonical_clean",
    "https",
  ] as const;

  const gaps = scored.length >= 2
    ? signalKeys
        .map((k) => {
          const values = scored.map((r) => Boolean((r.signals as Record<string, unknown>)[k]));
          const trueCount = values.filter(Boolean).length;
          const hasMix = trueCount > 0 && trueCount < values.length;
          return hasMix ? { signal: k, per_url: scored.map((r, i) => ({ url: r.url, value: values[i] })) } : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    : [];

  return {
    fetched_at: new Date().toISOString(),
    rows,
    diverging_signals: gaps,
  };
}
