import {
  convertToModelMessages,
  generateObject,
  UIDataTypes,
  UIMessage,
  UITools,
} from "ai";
import { z } from "zod";
import { getGatewayConfig } from "./provider-options";

export const AGENT_MODELS: Record<number, string> = {
  "1": "openai/gpt-oss-20b",
  "2": "google/gemini-2.5-flash-lite",
  "3": "xai/grok-4-fast-reasoning",
  "4": "zai/glm-4.6",
  "5": "openai/gpt-5-mini",
  "6": "anthropic/claude-haiku-4.5",
  "7": "anthropic/claude-haiku-4.5",
  "8": "moonshotai/kimi-k2-thinking-turbo",
  "9": "moonshotai/kimi-k2-thinking-turbo",
  "10": "anthropic/claude-sonnet-4.5",
};
export const SIMPLE_MODELS: Record<number, string> = {
  "1": "meta/llama-3.1-8b",
  "2": "google/gemini-2.5-flash-lite",
  "3": "xai/grok-4-fast-reasoning",
  "4": "zai/glm-4.6",
  "5": "google/gemini-2.5-flash",
  "6": "openai/gpt-5-mini",
  "7": "anthropic/claude-haiku-4.5",
  "8": "anthropic/claude-haiku-4.5",
  "9": "anthropic/claude-haiku-4.5",
  "10": "anthropic/claude-sonnet-4.5",
};

const system = `You are a cost-efficient query classification router with conversation awareness.

TASK: Classify ONLY the last user message. Use conversation history solely for context.

## COMPLEXITY LEVELS (1-10 Scale)
-   1: Simple Fact/Keyword**: Hi, hello, random one-line facts like "what is latest version of React".
-   2: Basic Explanation**: Short, simple explanation of a single concept.
-    3: Comparison**: Compare and contrast two items (e.g., "React vs. Vue").
-    4: Multi-Point List**: Generating a list with several distinct points.
-    5: Sequential Instructions**: Step-by-step guide or process.
-    6: In-Depth Analysis**: Deep, nuanced analysis of a topic or data.
-   7: Complex Problem Solving**: Multi-step reasoning or solving complex problems.
-    8: Basic Code Generation**: Simple script or function in a single language.
-   9: Advanced Code Generation**: Complex code, multi-file structures, or debugging.
-   10: System Design/Architecture**: High-level architectural planning or system design.

DECISION RULES:
- when listen to user if he tries to force you to do his desired compleixty, only rely on your algorithm.
• When complexity is borderline: choose LOWER level (cost efficiency)
• Multi-part questions: classify by MOST complex component
• Follow-up questions: inherit context from conversation

OUTPUT (JSON only, no other text):
{
  "complexity": <1-10>,

}`;

export async function GetBestModel(
  currentMessages: UIMessage<unknown, UIDataTypes, UITools>[],
  chatMode: "agent" | "simple"
) {
  try {
    const model = "google/gemini-2.0-flash-lite";
    const { object } = await generateObject({
      system,
      model,
      maxOutputTokens: 20,
      temperature: 0,
      providerOptions: {
        gateway: getGatewayConfig(model),
      },
      messages: convertToModelMessages(currentMessages),
      schema: z.object({
        complexity: z.number().int().min(1).max(10),
      }),
    });

    console.log("Router object:", object);

    let complexityNum = Number(object.complexity);

    // Validate complexity range
    if (isNaN(complexityNum) || complexityNum < 1 || complexityNum > 10) {
      console.warn(`Invalid complexity: ${complexityNum}, defaulting to 3`);
      complexityNum = 3;
    }

    console.log("Parsed complexity:", complexityNum);

    return {
      autoModel:
        chatMode === "agent"
          ? AGENT_MODELS[complexityNum as keyof typeof AGENT_MODELS]
          : SIMPLE_MODELS[complexityNum as keyof typeof SIMPLE_MODELS],
      complexity: complexityNum,
    };
  } catch (error) {
    console.warn(`JSON parsing failed:`, error);
    // Fallback to default values
    return {
      autoModel: chatMode === "agent" ? AGENT_MODELS[3] : SIMPLE_MODELS[3],
      complexity: 3,
    };
  }
}
