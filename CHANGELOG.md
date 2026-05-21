# Changelog

## 0.2.0 - 2026-05-21

7 new tools for editorial workflows + bulk audits.

- `track_queries(name, queries[], domain?, action)` - save / load / list named query panels
- `run_panel(name, domain?, engine?)` - run a panel through am_i_cited and snapshot to disk
- `citation_trend(panel, since?)` - time-series report of citation rate + per-query gained/lost deltas
- `compare_domains(urls[])` - side-by-side predict_citation across 2-10 URLs
- `wikipedia_mentions(domain, limit?, lang?)` - list Wikipedia articles referencing the domain
- `audit_sitemap(sitemap_url, limit?, concurrency?)` - bulk predict_citation across every URL in a sitemap
- `gsc_citation_gap(domain, queries[], start_date, end_date, ...)` - join GSC performance with AI citation status to surface "ranks in Google but invisible in AI" queries

Adds `google-auth-library` dependency for service-account auth in `gsc_citation_gap`.

## 0.1.0 - 2026-05-21

Initial release.

- `check_citations(query, engine?, max_results?)` - URLs cited by Perplexity, Claude, ChatGPT, Gemini, or Bing
- `am_i_cited(domain, queries[], engine?)` - presence and rank for a domain across a query cluster
- `ai_overview(query, location?, hl?)` - Google AI Overview presence and cited sources (SerpAPI)
- `cited_for(domain, since?, engine?, limit?)` - queries the domain was cited for, from local cache
- `predict_citation(url)` - 0-100 citation likelihood from public signals (Wikipedia, schema.org, llms.txt, GitHub, Reddit, canonical, HTTPS)
- Local JSON cache at `~/.config/citation-intelligence/cache.json`
- BYO API key passthrough; nothing stored remotely
