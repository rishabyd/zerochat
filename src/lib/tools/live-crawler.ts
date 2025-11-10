import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";

const exa = new Exa(process.env.EXA_API_KEY);

export const urlCrawler = tool({
  description:
    "Crawl multiple websites and extract content from main pages + subpages. Returns text, links, and metadata for each URL.",
  inputSchema: z.object({
    urls: z
      .array(z.url())
      .min(1)
      .max(10)
      .describe("Array of URLs strings to crawl (1-10 URLs)"),
    subpages: z
      .number()
      .optional()
      .default(5)
      .describe("Number of subpages to crawl per URL (1-10)"),
    include_links: z
      .boolean()
      .optional()
      .default(true)
      .describe("Include links found"),
  }),
  execute: async ({ urls, subpages = 5, include_links = true }) => {
    try {
      console.log(
        `🕷️ Crawling ${urls.length} URLs (with ${subpages} subpages each)`
      );

      const result = await exa.getContents(urls, {
        subpages: Math.min(subpages, 10),
        text: true,
      });

      if (!result.results || result.results.length === 0) {
        return {
          success: false,
          error: "No content found",
        };
      }

      // Group results by original URL
      const urlResults = urls.map((url) => {
        const urlPages = result.results.filter(
          (r) => r.url === url || r.url?.startsWith(url)
        );

        const pages = urlPages.map((content) => ({
          url: content.url || url,
          title: content.title || "No title",
          author: content.author || "",
          published_date: content.publishedDate || "",
          content: content.text || "",
        }));

        // Extract links for this URL
        let links: string[] = [];
        if (include_links) {
          const linkMatches =
            pages
              .map((p) => p.content)
              .join(" ")
              .match(/https?:\/\/[^\s)]+/g) || [];
          links = Array.from(new Set(linkMatches)).slice(0, 50);
        }

        return {
          url,
          pages_crawled: pages.length,
          pages,
          links: include_links ? links : [],
        };
      });

      console.log(
        `✅ Crawled ${result.results.length} total pages from ${urls.length} URLs`
      );

      return {
        success: true,
        source: "exa_getcontents",
        total_urls: urls.length,
        total_pages: result.results.length,
        results: urlResults,
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
