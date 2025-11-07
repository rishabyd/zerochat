import type { ToolUIPart } from "ai";

export const isToolUIPart = (part: unknown): part is ToolUIPart => {
  if (typeof part !== "object" || part === null) {
    return false;
  }

  const candidate = part as { toolCallId?: unknown; type?: unknown };

  return (
    typeof candidate.toolCallId === "string" &&
    typeof candidate.type === "string" &&
    candidate.type.startsWith("tool-")
  );
};
