import { z } from "zod";
import { loadPanel, savePanel, listPanels } from "../lib/panels.js";

export const trackQueriesInputSchema = {
  name: z
    .string()
    .min(1)
    .describe("Panel name, e.g. 'editorial-watchlist'. Used to save and recall the query set."),
  queries: z
    .array(z.string().min(1))
    .max(100)
    .optional()
    .describe("Queries to save under this panel. Omit to read the existing panel."),
  domain: z
    .string()
    .optional()
    .describe("Default domain to track for this panel, e.g. 'automatelab.tech'."),
  action: z
    .enum(["save", "load", "list"])
    .default("save")
    .describe("'save' writes the panel, 'load' returns an existing panel, 'list' enumerates all panels."),
};

const inputSchema = z.object(trackQueriesInputSchema);

export async function trackQueries(input: z.infer<typeof inputSchema>) {
  const parsed = inputSchema.parse(input);

  if (parsed.action === "list") {
    return { panels: await listPanels() };
  }

  if (parsed.action === "load") {
    const panel = await loadPanel(parsed.name);
    if (!panel) {
      return { error: `panel '${parsed.name}' not found`, panels: await listPanels() };
    }
    return panel;
  }

  if (!parsed.queries || parsed.queries.length === 0) {
    return {
      error:
        "action=save requires non-empty queries. To read an existing panel pass action=load.",
    };
  }

  const existing = await loadPanel(parsed.name);
  const now = new Date().toISOString();
  const panel = {
    name: parsed.name,
    queries: parsed.queries,
    domain: parsed.domain ?? existing?.domain,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  await savePanel(panel);
  return { saved: true, panel };
}
