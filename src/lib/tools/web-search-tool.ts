import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";

export const exa = new Exa(process.env.EXA_API_KEY);

export const webSearch = tool({
  description: "Search the web for up-to-date information",
  inputSchema: z.object({
    query: z.string().min(1).max(100).describe("The search query"),
    numResults: z
      .number()
      .min(5)
      .max(40)
      .optional()
      .default(10)
      .describe("Number of results to return"),
  }),
  execute: async ({ query, numResults }) => {
    try {
      const { results } = await exa.searchAndContents(query, {
        numResults,
        type: "auto",
        extras: {
          links: 5,
        },
        excludeSourceDomains: [
          "reddit.com",
          "quora.com",
          "twitter.com",
          "aljazeera.com",
        ],
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
        links: result.extras.links,
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
