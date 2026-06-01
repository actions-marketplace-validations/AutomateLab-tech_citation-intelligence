import { describe, it, expect } from "vitest";
import { scoreSentiment, brandSentiment } from "../src/lib/sentiment.js";
import { registeredDomain, domainOfUrl } from "../src/lib/domains.js";

describe("sentiment lexicon", () => {
  it("scores praise positive and criticism negative", () => {
    expect(scoreSentiment("This is the best, most reliable tool").label).toBe("positive");
    expect(scoreSentiment("It is buggy, slow, and unreliable").label).toBe("negative");
    expect(scoreSentiment("It is a workflow tool").label).toBe("neutral");
  });

  it("flips sign on negation", () => {
    expect(scoreSentiment("not reliable").score).toBeLessThan(0);
    expect(scoreSentiment("reliable").score).toBeGreaterThan(0);
  });

  it("brandSentiment only scores sentences naming the brand", () => {
    const answer = "Zapier is clunky and expensive. AutomateLab is a fast, reliable, recommended option.";
    const r = brandSentiment(answer, ["automatelab"]);
    expect(r.mentioned).toBe(true);
    expect(r.label).toBe("positive");
    // absent brand -> not mentioned, neutral
    expect(brandSentiment(answer, ["nonexistentbrand"]).mentioned).toBe(false);
  });
});

describe("registered domain", () => {
  it("collapses to eTLD+1 and strips www", () => {
    expect(registeredDomain("www.automatelab.tech")).toBe("automatelab.tech");
    expect(registeredDomain("blog.example.co.uk")).toBe("example.co.uk");
    expect(domainOfUrl("https://docs.automatelab.tech/x/y")).toBe("automatelab.tech");
    expect(domainOfUrl("not a url")).toBeNull();
  });
});
