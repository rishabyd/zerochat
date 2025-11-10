export const getGatewayConfig = (model: string) => {
  const configs: Record<string, { order: string[]; only: string[] }> = {
    "anthropic/claude-sonnet-4.5": {
      order: ["anthropic", "vertex", "bedrock"],
      only: ["anthropic", "vertex", "bedrock"],
    },
    "openai/gpt-4o-mini": {
      order: ["openai", "azure"],
      only: ["openai", "azure"],
    },
    "openai/gpt-5-mini": {
      order: ["openai", "azure"],
      only: ["openai", "azure"],
    },
    "openai/gpt-5-nano": {
      order: ["openai", "azure"],
      only: ["openai", "azure"],
    },
    "openai/gpt-5": {
      order: ["openai", "azure"],
      only: ["openai", "azure"],
    },
    "openai/o3-mini": {
      order: ["openai", "azure"],
      only: ["openai", "azure"],
    },
    "openai/o4-mini": {
      order: ["openai", "azure"],
      only: ["openai", "azure"],
    },
    "openai/gpt-oss-20b": {
      order: ["groq", "bedrock"],
      only: ["groq", "bedrock"],
    },
    "meta/llama-3.1-8b": {
      order: ["groq", "cerebras"],
      only: ["groq", "cerebras"],
    },
    "google/gemini-2.0-flash-lite": {
      order: ["vertex", "google"],
      only: ["vertex", "google"],
    },
    "anthropic/claude-3-haiku": {
      order: ["anthropic", "vertex", "bedrock"],
      only: ["anthropic", "vertex", "bedrock"],
    },
  };
  return configs[model] || { order: ["default"] };
};
