import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";

export const exa = new Exa(process.env.EXA_API_KEY);

export const webSearch = tool({
  description: "Search the web for up-to-date information, news, and articles.",
  inputSchema: z.object({
    query: z.string().min(1).max(500).describe("The search query"),
    numResults: z
      .number()
      .min(1)
      .max(20)
      .optional()
      .default(5)
      .describe("Number of results to return"),
  }),
  execute: async ({ query, numResults }) => {
    try {
      const { results } = await exa.searchAndContents(query, {
        numResults,
        type: "auto",
        useAutoprompt: true,
        text: true,
        highlights: {
          numSentences: 2,
          highlightsPerUrl: 1,
        },
        excludeDomains: [
          "reddit.com",
          "quora.com",
          "twitter.com",
          "facebook.com",
          "instagram.com",
          "tiktok.com",
        ],
      });

      if (!results?.length) {
        return `No results found for query: "${query}"`;
      }

      return results.map((result) => ({
        title: result.title,
        url: result.url,
        publishedDate: result.publishedDate,
        author: result.author,
        content: result.text
          ? result.text.slice(0, 1500)
          : "No text content available",
        highlight: result.highlights?.[0] || null,
      }));
    } catch (err) {
      console.error("❌ webSearch failed:", err);
      return `Search tool encountered an error: ${err instanceof Error ? err.message : "Unknown error"}`;
    }
  },
});
