export const getGatewayConfig = (model: string) => {
  const configs: Record<string, { order: string[]; only: string[] }> = {
    "anthropic/claude-sonnet-4.5": {
      order: ["anthropic", "bedrock"],
      only: ["anthropic", "bedrock"],
    },
    "meta/llama-3.1-8b": {
      order: ["deepinfra", "cerebras"],
      only: ["deepinfra", "cerebras"],
    },
    "amazon/nova-lite": {
      order: ["bedrock"],
      only: ["bedrock"],
    },
    "deepseek/deepseek-v3.2": {
      order: ["deepinfra"],
      only: ["deepinfra"],
    },
    "meta/llama-4-scout": {
      order: ["deepinfra", "bedrock"],
      only: ["deepinfra", "bedrock"],
    },
    "anthropic/claude-haiku-4.5": {
      order: ["anthropic", "bedrock"],
      only: ["anthropic", "bedrock"],
    },
    "zai/glm-4.6": {
      order: ["deepinfra", "baseten"],
      only: ["deepinfra", "baseten"],
    },

    "openai/gpt-oss-20b": {
      order: ["bedrock", "groq"],
      only: ["bedrock", "groq"],
    },
    "openai/gpt-oss-120b": {
      order: ["baseten", "bedrock"],
      only: ["baseten", "bedrock"],
    },

    "anthropic/claude-3-haiku": {
      order: ["anthropic", "bedrock"],
      only: ["anthropic", "bedrock"],
    },
    "anthropic/claude-3.5-haiku": {
      order: ["anthropic", "bedrock"],
      only: ["anthropic", "bedrock"],
    },
  };
  return configs[model] || { order: ["default"] };
};
