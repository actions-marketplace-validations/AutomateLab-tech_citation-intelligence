import { z } from "zod";
import { fetchJson } from "../lib/fetch.js";

export const wikipediaMentionsInputSchema = {
  domain: z
    .string()
    .min(1)
    .describe("Domain to search for, e.g. 'automatelab.tech' (without protocol)."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum mention rows to return."),
  lang: z
    .string()
    .default("en")
    .describe("Wikipedia language subdomain, e.g. 'en', 'de', 'fr'."),
};

const inputSchema = z.object(wikipediaMentionsInputSchema);

type ExtUrlEntry = {
  pageid?: number;
  ns?: number;
  title?: string;
  url?: string;
};

function normalizeDomain(d: string): string {
  return d
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

export async function wikipediaMentions(input: z.infer<typeof inputSchema>) {
  const parsed = inputSchema.parse(input);
  const needle = normalizeDomain(parsed.domain);

  const params = new URLSearchParams({
    action: "query",
    list: "exturlusage",
    euquery: needle,
    eulimit: String(parsed.limit),
    eunamespace: "0",
    format: "json",
    origin: "*",
  });

  const res = await fetchJson<{ query?: { exturlusage?: ExtUrlEntry[] } }>(
    `https://${parsed.lang}.wikipedia.org/w/api.php?${params.toString()}`,
    { timeoutMs: 10_000 },
  );

  const rows = (res.query?.exturlusage ?? []).map((e) => ({
    article_title: e.title,
    article_url: e.title
      ? `https://${parsed.lang}.wikipedia.org/wiki/${encodeURIComponent(e.title.replace(/ /g, "_"))}`
      : undefined,
    cited_url: e.url,
  }));

  return {
    domain: parsed.domain,
    lang: parsed.lang,
    fetched_at: new Date().toISOString(),
    total: rows.length,
    mentions: rows,
  };
}
