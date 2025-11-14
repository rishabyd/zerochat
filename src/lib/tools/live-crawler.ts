import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";

const exa = new Exa(process.env.EXA_API_KEY);

export const urlCrawler = tool({
  description:
    "Crawl multiple websites from provided URLs and extract content from main pages plus subpages. Returns text, metadata, and optionally extracted links for each URL.",
  inputSchema: z.object({
    urls: z
      .array(z.url())
      .min(1)
      .max(10)
      .describe("Array of URL strings to crawl (1-10 URLs)"),
    subpages: z
      .number()
      .min(1)
      .max(5)
      .optional()
      .default(5)
      .describe("Number of subpages to crawl per URL"),
    include_links: z
      .boolean()
      .optional()
      .default(true)
      .describe("Include extracted links found on crawled pages"),
  }),
  execute: async ({ urls, subpages = 5, include_links = true }) => {
    try {
      console.log(
        `🕷️ Crawling ${urls.length} URLs with up to ${subpages} subpages each`
      );

      const result = await exa.getContents(urls, {
        subpages: Math.min(subpages, 10),
        text: true,
      });

      if (!result.results || result.results.length === 0) {
        return {
          success: false,
          error: "No content found for provided URLs",
        };
      }

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

        let links: string[] = [];
        if (include_links) {
          const allContent = pages.map((p) => p.content).join(" ");
          const linkMatches = allContent.match(/https?:\/\/[^\s)]+/g) || [];
          // Deduplicate and limit
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
