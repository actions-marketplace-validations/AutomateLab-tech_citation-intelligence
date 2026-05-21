import { z } from "zod";
import { amICited } from "./am-i-cited.js";
import { loadPanel, appendSnapshot } from "../lib/panels.js";

export const runPanelInputSchema = {
  name: z
    .string()
    .min(1)
    .describe("Panel name previously saved via track_queries."),
  domain: z
    .string()
    .optional()
    .describe("Override the panel's default domain for this run."),
  engine: z
    .enum(["perplexity", "claude", "openai", "gemini", "bing", "auto"])
    .default("auto")
    .describe("AI engine to query."),
};

const inputSchema = z.object(runPanelInputSchema);

export async function runPanel(input: z.infer<typeof inputSchema>) {
  const parsed = inputSchema.parse(input);
  const panel = await loadPanel(parsed.name);
  if (!panel) {
    return { error: `panel '${parsed.name}' not found` };
  }
  const domain = parsed.domain ?? panel.domain;
  if (!domain) {
    return {
      error:
        "no domain set on panel and none passed; specify domain on the panel or per call",
    };
  }

  const result = await amICited({
    domain,
    queries: panel.queries,
    engine: parsed.engine,
  });

  const snapshot = {
    panel: panel.name,
    domain,
    engine: result.engine,
    taken_at: result.fetched_at,
    per_query: result.results,
    summary: {
      queries_total: result.summary.queries_total,
      queries_cited: result.summary.queries_cited,
      citation_rate: result.summary.citation_rate,
    },
  };
  const path = await appendSnapshot(snapshot);
  return { saved_to: path, snapshot };
}
