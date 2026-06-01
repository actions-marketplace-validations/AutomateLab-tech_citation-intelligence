// Registered-domain (eTLD+1) approximation, shared across tools.

const TWO_LABEL_TLDS = new Set([
  "co.uk", "co.jp", "co.kr", "co.in", "co.nz", "co.za", "com.au", "com.br",
  "com.cn", "com.ar", "ac.uk", "gov.uk", "gov.au", "net.au", "org.uk",
  "or.jp", "ne.jp", "ac.jp",
]);

/** eTLD+1 approximation: strips www and collapses to the registrable domain. */
export function registeredDomain(host: string): string {
  const lower = host.toLowerCase().replace(/^www\./, "");
  const parts = lower.split(".");
  if (parts.length <= 2) return lower;
  const tail2 = parts.slice(-2).join(".");
  const tail3 = parts.slice(-3).join(".");
  if (TWO_LABEL_TLDS.has(tail2)) return tail3;
  return tail2;
}

/** Registered domain of a URL string, or null if unparseable. */
export function domainOfUrl(url: string): string | null {
  try {
    return registeredDomain(new URL(url).hostname);
  } catch {
    return null;
  }
}
