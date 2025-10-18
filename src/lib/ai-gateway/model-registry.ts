import {
  convertToModelMessages,
  generateText,
  UIDataTypes,
  UIMessage,
  UITools,
} from "ai";

const PRO_MODELS = {
  1: "google/gemini-2.0-flash-lite", // Ultra-fast, cheap, simple queries
  2: "google/gemini-2.5-flash-lite", // Advanced queries,
  3: "openai/gpt-4o-mini", // Complex queries, strong reasoning
  4: "openai/gpt-4o-mini", // Balanced queries, richer reasoning
  5: "openai/gpt-4o", // Expert queries + coding anthropic/claude-sonnet-4
};

export const getGatewayConfig = (model: string) => {
  const configs: Record<string, { order: string[]; only: string[] }> = {
    "anthropic/claude-sonnet-4": {
      order: ["anthropic"],
      only: ["anthropic"],
    },
    "openai/gpt-4o-mini": {
      order: ["openai", "azure"],
      only: ["openai", "azure"],
    },
    "openai/gpt-4o": {
      order: ["openai", "azure"],
      only: ["openai", "azure"],
    },
    "meta/llama-3.1-8b": {
      order: ["groq"],
      only: ["groq"],
    },
    "google/gemini-2.0-flash-lite": {
      order: ["vertex"],
      only: ["vertex"],
    },
  };
  return configs[model] || { order: ["default"] };
};

const system = `You are a cost-efficient query classification router with conversation awareness.

TASK: Classify ONLY the last user message. Use conversation history solely for context.

COMPLEXITY (1-5):
1. BASIC: Facts, definitions, greetings
2. MODERATE: Explanations, tutorials, comparisons  
3. COMPLEX: Multi-step reasoning, analysis
4. ADVANCED: Technical depth, specialized knowledge
5. EXPERT: Programming, code generation

NEEDSWEB (boolean): Use intelligent criteria for current/dynamic information needs.

WEB SEARCH REQUIRED:
- use web search when you dont know something.
• Time indicators: "latest", "current", "today", "recent", "now", "this year"
• Live data: stocks, crypto, weather, sports, news
• Recent developments: product launches, company changes, political events
• Programming: library versions, framework updates, new tools, error messages
• Current status questions: "How is X doing?", "What's happening with..."

NO WEB SEARCH:
• Core programming syntax, algorithms, data structures
• Math, formulas, basic conversions
• Historical facts, established concepts
• Creative tasks, personal advice, hypotheticals
• General definitions of stable concepts

DECISION RULES:
• When complexity is borderline: choose LOWER level (cost efficiency)
• Multi-part questions: classify by MOST complex component
• Follow-up questions: inherit context from conversation
• When web search is uncertain: only if info could be outdated/incomplete

SEARCH_QUERY: If needsWeb=true, extract 4-6 core keywords + time relevance + latest events + add important and  context words to make query rich and direct.make query tailored for Indian audience (currency,units etc). Otherwise null.

OUTPUT (JSON only, no other text):
{
  "complexity": <1-5>,
  "needsWeb": <true/false>,
  "searchQuery": "<string or null>"
}`;

function extractJsonFromResponse(responseText: string): string {
  const trimmed = responseText.trim();

  // Check if response is wrapped in markdown code blocks
  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    // Remove the first and last three characters (the backticks)
    const withoutBackticks = trimmed.slice(3, -3).trim();

    // Check if there's a language identifier (like "json")
    if (withoutBackticks.startsWith("json")) {
      // Remove the language identifier and any following newlines
      return withoutBackticks.replace(/^json\s*\n?/, "").trim();
    }

    return withoutBackticks;
  }

  return trimmed;
}
export async function GetBestModel(
  currentMessages: UIMessage<unknown, UIDataTypes, UITools>[]
) {
  const models = PRO_MODELS;

  try {
    const response = await generateText({
      system,
      model: `google/gemini-2.5-flash-lite`,
      maxOutputTokens: 300,
      toolChoice: "none",
      temperature: 0,
      messages: convertToModelMessages(currentMessages),
    });

    const responseText = response.text.trim();
    console.log("Raw LLM response:", responseText);

    const jsonString = extractJsonFromResponse(responseText);
    console.log("Extracted JSON:", jsonString);

    const parsed = JSON.parse(jsonString);
    // Validate the parsed data
    let complexityNum = parseInt(parsed.complexity);
    const needsWeb = Boolean(parsed.needsWeb);
    const searchQuery = parsed.searchQuery?.trim() || null;

    // Validate complexity range
    if (isNaN(complexityNum) || complexityNum < 1 || complexityNum > 5) {
      console.warn(`Invalid complexity: ${complexityNum}, defaulting to 3`);
      complexityNum = 3;
    }

    console.log("Parsed complexity:", complexityNum);
    console.log("Parsed needsWeb:", needsWeb);
    console.log("Parsed searchQuery:", searchQuery);

    return {
      model: models[complexityNum as keyof typeof models],
      complexity: complexityNum,
      needsWeb: needsWeb,
      searchQuery: searchQuery,
    };
  } catch (error) {
    console.warn(`JSON parsing failed:`, error);
    // Fallback to default values
    return {
      model: models[3],
      complexity: 3,
      needsWeb: false,
      searchQuery: null,
    };
  }
}
