import { tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY);

export const urlCrawler = tool({
  description:
    "Crawl website and extract content from main page + subpages. Returns text, links, and metadata.",
  inputSchema: z.object({
    url: z.string().url().describe("URL to crawl"),
    subpages: z
      .number()
      .optional()
      .default(5)
      .describe("Number of subpages to crawl (1-10)"),
    include_links: z
      .boolean()
      .optional()
      .default(true)
      .describe("Include links found"),
  }),
  execute: async ({ url, subpages = 5, include_links = true }) => {
    try {
      console.log(`🕷️ Crawling: ${url} (with ${subpages} subpages)`);

      // Use exact Exa function
      const result = await exa.getContents([url], {
        subpages: Math.min(subpages, 10),
        text: true,
      });

      if (!result.results || result.results.length === 0) {
        return {
          success: false,
          error: "No content found",
        };
      }

      // Process all pages (main + subpages)
      const pages = result.results.map((content) => ({
        url: content.url || url,
        title: content.title || "No title",
        author: content.author || "",
        published_date: content.publishedDate || "",
        content: content.text || "",
      }));

      // Extract links if requested
      let allLinks: string[] = [];
      if (include_links) {
        const linkMatches =
          pages
            .map((p) => p.content)
            .join(" ")
            .match(/https?:\/\/[^\s)]+/g) || [];
        allLinks = Array.from(new Set(linkMatches)).slice(0, 50);
      }

      console.log(`✅ Crawled ${pages.length} pages`);

      return {
        success: true,
        url,
        source: "exa_getcontents",
        pages_crawled: pages.length,
        data: pages,
        links: include_links ? allLinks : [],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("❌ Crawl error:", errorMsg);

      return {
        success: false,
        error: errorMsg,
      };
    }
  },
});
