"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { useChatStore } from "@/lib/store/useChatStore";
import { isToolUIPart } from "@/lib/utils/is-tool-part";
import type { ToolUIPart, UIDataTypes, UIMessage, UITools } from "ai";
import { Brain, Globe, LoaderPinwheel, Wrench } from "lucide-react";
import { useMemo } from "react";
import MessageBubble from "./message-bubble";
import { Shimmer } from "@/components/ai-elements/shimmer";

export type ChatMessageType = UIMessage<unknown, UIDataTypes, UITools>;

type MessagePart = ChatMessageType["parts"] extends Array<infer P> ? P : never;

type ReasoningPart = MessagePart & {
  type: "reasoning";
  status?: string;
  reasoning?: {
    status?: string;
    title?: string;
  };
};

const TOOL_ACTIVE_STATES: Array<ToolUIPart["state"]> = [
  "input-streaming",
  "input-available",
];

const REASONING_ACTIVE_STATES = ["in-progress", "streaming", "pending"];

const isReasoningPart = (part: MessagePart): part is ReasoningPart => {
  if (typeof part !== "object" || part === null) return false;
  return (part as { type?: unknown }).type === "reasoning";
};

const isActiveReasoning = (part: ReasoningPart): boolean => {
  // Check if reasoning is actively happening (not completed)
  const status = part.status || part.reasoning?.status;
  if (!status) return true; // If no status, assume active
  return REASONING_ACTIVE_STATES.some((state) =>
    status.toLowerCase().includes(state),
  );
};

const stringFromUnknown = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof (value as { toString: () => string }).toString === "function"
  ) {
    const rendered = (value as { toString: () => string }).toString();
    if (rendered !== "[object Object]") {
      return rendered;
    }
  }

  return null;
};

const extractTextFromPart = (part: MessagePart): string | null => {
  if (typeof part !== "object" || part === null) return null;

  const candidates: unknown[] = [];
  if ("text" in part) candidates.push((part as { text?: unknown }).text);
  if ("delta" in part) candidates.push((part as { delta?: unknown }).delta);
  if ("textDelta" in part)
    candidates.push((part as { textDelta?: unknown }).textDelta);
  if ("value" in part) candidates.push((part as { value?: unknown }).value);

  for (const candidate of candidates) {
    const asString = stringFromUnknown(candidate);
    if (asString && asString.trim().length > 0) {
      return asString;
    }
  }

  return null;
};

const getIndicatorState = (messages: ChatMessageType[]) => {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== "assistant") {
    return { type: "thinking", label: null };
  }

  for (const part of lastMsg.parts ?? []) {
    if (isToolUIPart(part) && TOOL_ACTIVE_STATES.includes(part.state)) {
      const toolName = part.type.startsWith("tool-")
        ? part.type.slice(5)
        : "tool";
      return { type: "tool", label: toolName };
    }
    if (isReasoningPart(part) && isActiveReasoning(part)) {
      return { type: "reasoning", label: null };
    }
  }

  return { type: "thinking", label: null };
};

interface MessageAreaProps {
  messages: ChatMessageType[]; // Array of chat messages to display
}

export default function MessageAreaComponent({ messages }: MessageAreaProps) {
  const thinking = useChatStore((s) => s.thinking);
  const error = useChatStore((s) => s.error);

  const { type, label } = useMemo(
    () => getIndicatorState(messages),
    [messages],
  );

  const getIndicator = () => {
    if (type === "tool") {
      const isSearch =
        label?.toLowerCase().includes("search") ||
        label?.toLowerCase().includes("web");
      return {
        text: isSearch ? "Searching the web..." : `Using ${label}...`,
        Icon: isSearch ? Globe : Wrench,
      };
    }
    if (type === "reasoning")
      return { text: "Reasoning deeply...", Icon: Brain };
    return { text: "Thinking...", Icon: LoaderPinwheel };
  };

  const { text: indicatorText, Icon: IndicatorIcon } = getIndicator();

  // Check if the last assistant message has started streaming text content
  const hasStreamingText = useMemo(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return false;

    // Check if there's any text content in the message parts
    return lastMsg.parts.some((part) => {
      if (part.type === "text") {
        const text = (part as { text?: string }).text;
        return text && text.trim().length > 0;
      }
      return false;
    });
  }, [messages]);

  // Hide status immediately when text streaming starts
  const shouldShowIndicator = thinking && !hasStreamingText;

  function isUserOrAssistant(
    msg: ChatMessageType,
  ): msg is ChatMessageType & { role: "user" | "assistant" } {
    return msg.role === "user" || msg.role === "assistant";
  }

  const filteredMessages = messages.filter(isUserOrAssistant);

  // Find the index of the last user message
  const lastUserMessageIndex = filteredMessages.reduce(
    (lastIndex, msg, index) => {
      return msg.role === "user" ? index : lastIndex;
    },
    -1,
  );

  return (
    <Conversation className="w-full h-full flex-1 relative">
      <ConversationContent className="flex flex-col pt-9 lg:pt-6 w-full">
        {filteredMessages.map((msg, index) => (
          <div key={`${msg.id ?? "msg"}-${index}`} className="relative">
            <MessageBubble msg={msg} />
            {/* Reserve fixed space for status indicator right after the last user message */}
            {index === lastUserMessageIndex && (
              <div className="mx-auto w-full max-w-[95vw] lg:max-w-[55vw] px-7 h-10">
                <div
                  className={`flex items-center gap-2 py-2 text-sm text-muted-foreground transition-opacity duration-100 ${
                    shouldShowIndicator ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="flex  items-center gap-2 ">
                    <IndicatorIcon className="size-6 animate-pulse flex-shrink-0" />
                    <Shimmer className="">{indicatorText}</Shimmer>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {error && (
          <div className="mx-auto w-full max-w-[95vw] lg:max-w-[60vw] p-7">
            <div className="text-red-500 text-3xl">Error</div>
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
