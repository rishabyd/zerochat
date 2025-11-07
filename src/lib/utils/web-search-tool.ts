import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';

export const exa = new Exa(process.env.EXA_API_KEY);

const Params = z.object({
  query: z.string().min(1).max(100).describe('The search query'),
});

export const webSearch = tool({
  description: 'Search the web for up-to-date information',
  inputSchema: Params,
  execute: async ({ query }: z.infer<typeof Params>) => {
    const { results } = await exa.searchAndContents(query);
    return results.map(result => ({
      title: result.title,
      url: result.url,
      content: result.text.slice(0, 1000),
      publishedDate: result.publishedDate,
    }));
  },
});

