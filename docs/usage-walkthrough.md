# Measure a fixed citation query set

Choose a small fixed set of user queries, one engine, and a domain. `report_visibility` requires `domain`; pass `queries` explicitly rather than relying on a changing saved panel.

Example input: `{"domain":"example.com","queries":["example integration documentation","example workflow troubleshooting"],"engine":"perplexity","max_results":5,"include_markdown":true}`. Configure the engine key locally. This input is an example, not a recorded visibility result.

Record the observation time, engine surface, query text and returned source URLs. An API-proxy response can differ from the consumer product. Keep a source URL and rank only when that engine actually returned it.

A missing key, rate limit or failed request is an unavailable observation. It must not become a zero-citation result. The prepared fix propagates provider failures from an incomplete report, and prevents saving an empty failed panel snapshot. A successful answer containing only other domains is a genuine negative for the target in that particular response.

Compare the same set after a release. Separate newly observed changes from old cached results. Never claim a ranking or citation improvement from a failed or missing check.
