import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";

// Initialise Exa client once
export const exa = new Exa(process.env.EXA_API_KEY);

export const webSearch = tool({
  description:
    "Search the web for current information and get a direct, grounded answer.",
  inputSchema: z.object({
    query: z.string().min(1).max(200).describe("The web search query"),
  }),
  execute: async ({ query }) => {
    try {
      console.log("🔍 webSearch> query:", query);

      if (!process.env.EXA_API_KEY) {
        return {
          answer: "Web search is not configured. Please contact support.",
          query,
        };
      }

      const { answer } = await exa.answer(query, {
        systemPrompt:
          "You are a web search assistant delivering precise, up-to-date information tailored for an Indian audience. Please adhere to the following guidelines:\n\n" +
          "1. Provide comprehensive and factual answers, incorporating specific details, statistics, and research findings.\n" +
          "2. Include relevant citations and sources whenever available.\n" +
          "3. Use Indian Rupees (₹) for currency and identify the region as India and Asia.\n" +
          "4. Organize information into clear sections for easy navigation.\n" +
          "5. Present dates, numerical data, and specific data points clearly.\n" +
          "6. Clearly differentiate between confirmed facts and any rumors or speculation.\n" +
          "7. If information is limited or unavailable, communicate that transparently.\n" +
          "8. Focus solely on the most recent and pertinent information.\n" +
          "9. Utilize bullet points or numbered lists to enhance readability.\n" +
          "10. Provide context and background information when it adds value.\n" +
          "11. Use a conversational tone to engage the audience effectively.\n" +
          "12. Include examples to clarify complex points where necessary.",
        stream: false,
      });

      console.log("✅ webSearch> Exa answer:", answer);

      return { answer, query };
    } catch (err) {
      console.error("❌ webSearch> failed:", err);
      return {
        answer: `Unable to find current information about: ${query}. Try rephrasing or check your connection.`,
        query,
      };
    }
  },
});
