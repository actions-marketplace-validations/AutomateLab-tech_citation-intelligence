import { z } from "zod";
import { readSnapshots } from "../lib/panels.js";

export const citationTrendInputSchema = {
  panel: z.string().min(1).describe("Panel name to report on."),
  since: z
    .string()
    .optional()
    .describe("ISO date floor, e.g. '2026-01-01'. Only include snapshots on or after."),
};

const inputSchema = z.object(citationTrendInputSchema);

type Snap = Awaited<ReturnType<typeof readSnapshots>>[number];

function queryDeltas(snapshots: Snap[]) {
  if (snapshots.length < 2) return [];
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const firstMap = new Map(first.per_query.map((q) => [q.query, q.cited]));
  const deltas: Array<{ query: string; change: "gained" | "lost" | "unchanged"; first: boolean; last: boolean }> = [];
  for (const q of last.per_query) {
    const wasCited = firstMap.get(q.query) ?? false;
    const change = !wasCited && q.cited ? "gained" : wasCited && !q.cited ? "lost" : "unchanged";
    deltas.push({ query: q.query, change, first: wasCited, last: q.cited });
  }
  return deltas;
}

export async function citationTrend(input: z.infer<typeof inputSchema>) {
  const parsed = inputSchema.parse(input);
  const snapshots = await readSnapshots(parsed.panel, parsed.since);
  if (snapshots.length === 0) {
    return { panel: parsed.panel, snapshots: 0, message: "no snapshots found" };
  }

  const series = snapshots.map((s) => ({
    taken_at: s.taken_at,
    engine: s.engine,
    queries_total: s.summary.queries_total,
    queries_cited: s.summary.queries_cited,
    citation_rate: s.summary.citation_rate,
  }));

  return {
    panel: parsed.panel,
    domain: snapshots[snapshots.length - 1].domain,
    snapshots: snapshots.length,
    first_taken_at: snapshots[0].taken_at,
    last_taken_at: snapshots[snapshots.length - 1].taken_at,
    series,
    query_deltas: queryDeltas(snapshots),
  };
}
