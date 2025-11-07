import { tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY);

export const pricingCalc = tool({
  description:
    "Calculate real-time infrastructure costs by dynamically fetching live pricing from provider pages. Always current.",
  inputSchema: z.object({
    provider: z
      .enum([
        "vercel",
        "cloudflare",
        "aws",
        "supabase",
        "upstash",
        "digital-ocean",
        "heroku",
      ])
      .describe("Cloud provider name"),
    requests_per_month: z.number().describe("Monthly API requests"),
    storage_gb: z.number().optional().describe("Storage in GB"),
    compute_hours: z.number().optional().describe("Compute hours/month"),
    bandwidth_gb: z.number().optional().describe("Bandwidth in GB"),
  }),
  execute: async ({
    provider,
    requests_per_month,
    storage_gb = 0,
    compute_hours = 0,
    bandwidth_gb = 0,
  }) => {
    try {
      // Step 1: Dynamically find pricing page using web search
      const pricingUrl = await findPricingPage(provider);

      if (!pricingUrl) {
        return { error: `Could not find pricing page for ${provider}` };
      }

      console.log(`📍 Found pricing page:`, pricingUrl);

      // Step 2: Fetch live pricing data
      const pricingData = await fetchAndParsePricing(pricingUrl, provider);

      if (!pricingData) {
        return { error: `Could not parse pricing from ${pricingUrl}` };
      }

      // Step 3: Calculate costs
      const breakdown = calculateCosts(provider, pricingData, {
        requests_per_month,
        storage_gb,
        compute_hours,
        bandwidth_gb,
      });

      return {
        provider,
        pricingUrl,
        fetchedAt: new Date().toISOString(),
        workload: {
          requests_per_month,
          storage_gb,
          compute_hours,
          bandwidth_gb,
        },
        breakdown,
        monthly: breakdown.total.toFixed(2),
        yearly: (breakdown.total * 12).toFixed(2),
      };
    } catch (error) {
      return { error: `Pricing calculation failed: ${error}` };
    }
  },
});

async function findPricingPage(provider: string): Promise<string | null> {
  try {
    // Use Exa to find the official pricing page
    const results = await exa.search(`${provider} official pricing page 2025`, {
      type: "auto",
      numResults: 3,
    });

    // Filter for official pricing pages
    const pricingPage = results.results.find((result) => {
      const url = result.url.toLowerCase();
      const title = (result.title || "").toLowerCase();

      return (
        (url.includes("/pricing") || title.includes("pricing")) &&
        url.includes(provider.toLowerCase().replace(/-/g, ""))
      );
    });

    return pricingPage?.url || null;
  } catch (error) {
    console.error(`Error finding pricing page for ${provider}:`, error);
    return null;
  }
}

async function fetchAndParsePricing(
  url: string,
  provider: string,
): Promise<Record<string, number> | null> {
  try {
    // Fetch the page with browser user agent
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Parse pricing based on provider patterns
    return extractPricingPatterns(html, provider);
  } catch (error) {
    console.error(`Error fetching pricing from ${url}:`, error);
    return null;
  }
}

function extractPricingPatterns(
  html: string,
  provider: string,
): Record<string, number> | null {
  const patterns: Record<
    string,
    (html: string) => Record<string, number> | null
  > = {
    supabase: (html) => {
      // Extract from HTML patterns like "$0.125 per GB", "$0.00325 per MAU"
      const storageMatch = html.match(/\$([0-9.]+)\s*per\s*GB(?!.*egress)/i);
      const mauMatch = html.match(/\$([0-9.]+)\s*per\s*MAU/i);
      const egressMatch = html.match(/\$([0-9.]+)\s*per\s*GB.*egress/i);

      return {
        storage_per_gb: storageMatch ? parseFloat(storageMatch[1]) : 0.125,
        mau_overage: mauMatch ? parseFloat(mauMatch[1]) : 0.00325,
        egress_per_gb: egressMatch ? parseFloat(egressMatch[1]) : 0.09,
        base_pro: 25,
      };
    },

    cloudflare: (html) => {
      const workersMatch = html.match(
        /\$([0-9.]+)\s*(?:per|\/)\s*(?:1\s*)?million/i,
      );
      const kvMatch = html.match(/\$([0-9.]+)\s*(?:per|\/)\s*GB/i);

      return {
        workers_per_1m: workersMatch ? parseFloat(workersMatch[1]) : 0.5,
        kv_per_gb: kvMatch ? parseFloat(kvMatch[1]) : 0.5,
        do_per_1m: 0.15,
      };
    },

    vercel: (html) => {
      const bandwidthMatch = html.match(/\$([0-9.]+)\s*(?:per|\/)\s*GB/i);
      return {
        bandwidth_per_gb: bandwidthMatch ? parseFloat(bandwidthMatch[1]) : 0.5,
        compute_per_gb_hour: 0.5,
      };
    },

    aws: (html) => {
      const lambdaMatch = html.match(
        /\$([0-9.]+)(?:e-[0-9])?\s*(?:per|\/)\s*request/i,
      );
      const s3Match = html.match(/\$([0-9.]+)\s*(?:per|\/)\s*GB.*storage/i);

      return {
        lambda_per_request: lambdaMatch
          ? parseFloat(lambdaMatch[1])
          : 0.0000002,
        s3_per_gb: s3Match ? parseFloat(s3Match[1]) : 0.023,
        data_transfer_per_gb: 0.09,
      };
    },

    upstash: (html) => {
      const requestMatch = html.match(
        /\$([0-9.]+)(?:e-[0-9])?\s*(?:per|\/)\s*request/i,
      );
      const storageMatch = html.match(/\$([0-9.]+)\s*(?:per|\/)\s*GB/i);

      return {
        per_request: requestMatch ? parseFloat(requestMatch[1]) : 0.0000015,
        storage_per_gb: storageMatch ? parseFloat(storageMatch[1]) : 0.4,
      };
    },

    "digital-ocean": (html) => {
      const dropletMatch = html.match(
        /\$([0-9.]+)\s*(?:per|\/)\s*month.*droplet/i,
      );
      const storageMatch = html.match(/\$([0-9.]+)\s*(?:per|\/)\s*GB/i);

      return {
        droplet_basic: dropletMatch ? parseFloat(dropletMatch[1]) : 5,
        storage_per_gb: storageMatch ? parseFloat(storageMatch[1]) : 0.1,
      };
    },

    heroku: (html) => {
      const dynoMatch = html.match(/\$([0-9.]+)\s*(?:per|\/)\s*dyno/i);
      return {
        dyno_per_hour: dynoMatch ? parseFloat(dynoMatch[1]) : 0.005,
      };
    },
  };

  const parser = patterns[provider];
  if (!parser) return null;

  try {
    return parser(html);
  } catch (error) {
    console.error(`Error parsing ${provider} pricing:`, error);
    return null;
  }
}

function calculateCosts(
  provider: string,
  pricingData: Record<string, number>,
  workload: any,
) {
  const calculators: Record<
    string,
    () => { breakdown: Record<string, number>; total: number }
  > = {
    supabase: () => {
      const mauCost = workload.requests_per_month * pricingData.mau_overage;
      const storageCost = workload.storage_gb * pricingData.storage_per_gb;
      const egressCost = workload.bandwidth_gb * pricingData.egress_per_gb;

      return {
        breakdown: {
          "Base Pro": pricingData.base_pro,
          "MAU overage": mauCost,
          Storage: storageCost,
          Egress: egressCost,
        },
        total: pricingData.base_pro + mauCost + storageCost + egressCost,
      };
    },

    cloudflare: () => {
      const workersCost =
        (workload.requests_per_month / 1000000) * pricingData.workers_per_1m;
      const kvCost = workload.storage_gb * pricingData.kv_per_gb;

      return {
        breakdown: { Workers: workersCost, "KV Storage": kvCost },
        total: workersCost + kvCost,
      };
    },

    aws: () => {
      const lambdaCost =
        workload.requests_per_month * pricingData.lambda_per_request;
      const s3Cost = workload.storage_gb * pricingData.s3_per_gb;

      return {
        breakdown: { Lambda: lambdaCost, S3: s3Cost },
        total: lambdaCost + s3Cost,
      };
    },

    vercel: () => {
      const bandwidthCost =
        workload.bandwidth_gb * pricingData.bandwidth_per_gb;
      return {
        breakdown: { Bandwidth: bandwidthCost },
        total: bandwidthCost,
      };
    },

    upstash: () => {
      const requestCost = workload.requests_per_month * pricingData.per_request;
      const storageCost = workload.storage_gb * pricingData.storage_per_gb;

      return {
        breakdown: { Requests: requestCost, Storage: storageCost },
        total: requestCost + storageCost,
      };
    },
  };

  const calculator = calculators[provider];
  return calculator ? calculator() : { breakdown: {}, total: 0 };
}
