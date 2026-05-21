import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { CONFIG_DIR } from "./config.js";

export type Panel = {
  name: string;
  queries: string[];
  domain?: string;
  created_at: string;
  updated_at: string;
};

export type Snapshot = {
  panel: string;
  domain: string;
  engine: string;
  taken_at: string;
  per_query: Array<{
    query: string;
    cited: boolean;
    rank?: number;
    matching_urls: string[];
  }>;
  summary: {
    queries_total: number;
    queries_cited: number;
    citation_rate: number;
  };
};

const PANEL_DIR = join(CONFIG_DIR, "panels");
const SNAPSHOT_DIR = join(CONFIG_DIR, "snapshots");

function panelFile(name: string): string {
  return join(PANEL_DIR, `${sanitize(name)}.json`);
}

function snapshotDir(name: string): string {
  return join(SNAPSHOT_DIR, sanitize(name));
}

function sanitize(name: string): string {
  return name.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
}

export async function savePanel(panel: Panel): Promise<void> {
  await mkdir(PANEL_DIR, { recursive: true });
  await writeFile(panelFile(panel.name), JSON.stringify(panel, null, 2), "utf8");
}

export async function loadPanel(name: string): Promise<Panel | null> {
  try {
    const raw = await readFile(panelFile(name), "utf8");
    return JSON.parse(raw) as Panel;
  } catch {
    return null;
  }
}

export async function listPanels(): Promise<string[]> {
  try {
    const files = await readdir(PANEL_DIR);
    return files.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  } catch {
    return [];
  }
}

export async function appendSnapshot(snap: Snapshot): Promise<string> {
  const dir = snapshotDir(snap.panel);
  await mkdir(dir, { recursive: true });
  const filename = `${snap.taken_at.replace(/[:.]/g, "-")}.json`;
  const path = join(dir, filename);
  await writeFile(path, JSON.stringify(snap, null, 2), "utf8");
  return path;
}

export async function readSnapshots(
  panel: string,
  since?: string,
): Promise<Snapshot[]> {
  const dir = snapshotDir(panel);
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const snapshots: Snapshot[] = [];
  for (const f of files.filter((f) => f.endsWith(".json")).sort()) {
    try {
      const raw = await readFile(join(dir, f), "utf8");
      const snap = JSON.parse(raw) as Snapshot;
      if (since && snap.taken_at < since) continue;
      snapshots.push(snap);
    } catch {
      // ignore corrupt snapshot
    }
  }
  return snapshots;
}
