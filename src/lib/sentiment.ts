// Lexicon-based sentiment for the snippet of an AI answer that mentions a brand.
// Deterministic, no backend, no API key - in keeping with the rest of the server.
// Scores the tone of how an engine talks about a domain, not the whole answer.

const POSITIVE: Record<string, number> = {
  best: 2, great: 2, excellent: 3, leading: 2, popular: 1, powerful: 2, robust: 2,
  reliable: 2, trusted: 2, recommended: 2, recommend: 2, top: 2, strong: 1, fast: 1,
  easy: 1, flexible: 1, comprehensive: 2, mature: 1, favorite: 2, preferred: 2,
  efficient: 1, intuitive: 2, seamless: 2, versatile: 1, affordable: 1, free: 1,
  "open-source": 1, opensource: 1, scalable: 1, secure: 1, accurate: 2, helpful: 2,
  wins: 2, advantage: 1, ideal: 2, superior: 2, standout: 2, praised: 2,
};

const NEGATIVE: Record<string, number> = {
  worst: -3, bad: -2, poor: -2, weak: -2, slow: -2, buggy: -3, broken: -3,
  limited: -1, expensive: -1, complex: -1, complicated: -2, confusing: -2,
  difficult: -2, lacks: -2, lacking: -2, missing: -1, outdated: -2, deprecated: -2,
  unreliable: -3, insecure: -2, vulnerable: -2, problem: -1, problematic: -2,
  issue: -1, issues: -1, drawback: -2, downside: -2, criticized: -2, struggles: -2,
  fails: -2, fail: -2, clunky: -2, steep: -1, overkill: -1, niche: -1, risky: -2,
};

const NEGATORS = new Set(["not", "no", "never", "without", "lacks", "isn't", "aren't", "don't", "doesn't", "can't", "cannot", "hardly", "barely"]);

export type SentimentLabel = "positive" | "neutral" | "negative";

export interface SentimentResult {
  /** Normalized score in [-1, 1]. */
  score: number;
  label: SentimentLabel;
  /** Number of lexicon hits that contributed. */
  hits: number;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z'-]*/g) ?? [];
}

/** Score a text snippet's tone. Negation flips the sign of the next 2 tokens. */
export function scoreSentiment(text: string): SentimentResult {
  const tokens = tokenize(text);
  let raw = 0;
  let hits = 0;
  let negateFor = 0;
  for (const tok of tokens) {
    if (NEGATORS.has(tok)) {
      negateFor = 3; // negate the next up-to-3 tokens
      continue;
    }
    const val = POSITIVE[tok] ?? NEGATIVE[tok] ?? 0;
    if (val !== 0) {
      raw += negateFor > 0 ? -val : val;
      hits++;
    }
    if (negateFor > 0) negateFor--;
  }
  // Squash to [-1, 1]; each strong hit moves the needle ~0.3.
  const score = hits === 0 ? 0 : Math.max(-1, Math.min(1, raw / (hits * 3 + 2)));
  const label: SentimentLabel = score > 0.12 ? "positive" : score < -0.12 ? "negative" : "neutral";
  return { score: Math.round(score * 100) / 100, label, hits };
}

/**
 * Pull the sentences from `answer` that mention any of `needles` (brand tokens or
 * domain), and score their combined tone. Returns neutral/0 with mentioned=false
 * when the answer never names the brand.
 */
export function brandSentiment(answer: string | undefined, needles: string[]): SentimentResult & { mentioned: boolean } {
  if (!answer) return { score: 0, label: "neutral", hits: 0, mentioned: false };
  const lowNeedles = needles.map((n) => n.toLowerCase()).filter(Boolean);
  const sentences = answer.split(/(?<=[.!?])\s+/);
  const relevant = sentences.filter((s) => {
    const low = s.toLowerCase();
    return lowNeedles.some((n) => low.includes(n));
  });
  if (relevant.length === 0) {
    return { score: 0, label: "neutral", hits: 0, mentioned: false };
  }
  const result = scoreSentiment(relevant.join(" "));
  return { ...result, mentioned: true };
}
