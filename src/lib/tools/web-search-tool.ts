import { tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";

export const exa = new Exa(process.env.EXA_API_KEY);

export const webSearch = tool({
  description: "Search the web for up-to-date information",
  inputSchema: z.object({
    query: z.string().min(1).max(100).describe("The search query"),
    numResults: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .default(5)
      .describe("Number of results to return"),
  }),
  execute: async ({ query, numResults }) => {
    try {
      const { results } = await exa.searchAndContents(query, {
        numResults,
        livecrawl: "auto",
        text: true,
        highlights: true,
        type: "auto",
        excludeSourceDomains: ["reddit.com", "quora.com", "twitter.com"],
      });

      if (!results?.length) {
        return {
          success: false,
          error: `No results for: "${query}"`,
        };
      }

      return results.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.text,
        highlights: result.highlights?.[0] || "",
        publishedDate: result.publishedDate,
        score: result.score,
      }));
    } catch (err) {
      console.error("❌ webSearch failed:", err);
      throw new Error(
        `Search failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  },
});
