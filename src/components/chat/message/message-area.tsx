"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useChatStore } from "@/lib/store/useChatStore";
import { isToolUIPart } from "@/lib/utils/is-tool-part";
import type { ToolUIPart, UIDataTypes, UIMessage, UITools } from "ai";
import {
  Archive,
  ArchiveRestore,
  ArrowBigUp,
  Banknote,
  Brain,
  Globe,
  LoaderPinwheel,
  TextSelect,
  Wrench,
} from "lucide-react";
import { useMemo } from "react";
import MessageBubble from "./message-bubble";

export type ChatMessageType = UIMessage<unknown, UIDataTypes, UITools>;

type MessagePart = ChatMessageType["parts"] extends Array<infer P> ? P : never;

// Standard reasoning part structure across all providers
type ReasoningPart = MessagePart & {
  type: "reasoning";
  text?: string;
  textDelta?: string;
  state?: string;
  reasoning?: {
    state?: string;
    title?: string;
    text?: string;
  };
};

const TOOL_ACTIVE_STATES: Array<ToolUIPart["state"]> = [
  "input-streaming",
  "input-available",
];

// States that indicate active reasoning across all providers
const REASONING_ACTIVE_STATES = [
  "in-progress",
  "streaming",
  "pending",
  "thinking",
];

// Type guard for reasoning parts - works across all providers
const isReasoningPart = (part: MessagePart): part is ReasoningPart => {
  if (typeof part !== "object" || part === null) return false;
  return (part as { type?: unknown }).type === "reasoning";
};

// Robust detection of active reasoning across all providers
const isActiveReasoning = (part: ReasoningPart): boolean => {
  // Check both part.state and part.reasoning.state
  const partState = part.state?.toLowerCase() || "";
  const reasoningState = part.reasoning?.state?.toLowerCase() || "";

  // Active if state indicates streaming/in-progress
  const hasActiveState = REASONING_ACTIVE_STATES.some(
    (state) => partState.includes(state) || reasoningState.includes(state)
  );

  if (hasActiveState) return true;

  // Also consider active if no text content yet (initial streaming state)
  const hasText =
    (part.text && part.text.trim().length > 0) ||
    (part.textDelta && part.textDelta.trim().length > 0) ||
    (part.reasoning?.text && part.reasoning.text.trim().length > 0);

  return !hasText;
};

type StatusIndicatorState = {
  type: "reasoning" | "tool" | "thinking";
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  metadata?: string;
};

const getIndicatorState = (
  messages: ChatMessageType[]
): StatusIndicatorState => {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== "assistant") {
    return {
      type: "thinking",
      Icon: LoaderPinwheel,
      label: "Thinking...",
    };
  }

  for (const part of lastMsg.parts ?? []) {
    // Tool detection - prioritize over reasoning
    if (isToolUIPart(part) && TOOL_ACTIVE_STATES.includes(part.state)) {
      const toolName = part.type.startsWith("tool-")
        ? part.type.slice(5)
        : "tool";

      const isWebSearch =
        toolName.toLowerCase().includes("websearch") ||
        toolName.toLowerCase().includes("web");

      const isPricingSearch = toolName.toLowerCase().includes("pricingcalc");
      const isLiveUrlCrawling = toolName.toLowerCase().includes("urlcrawler");
      const isApiDebugger = toolName.toLowerCase().includes("apidebugger");
      const isFetchMemory = toolName === "searchMemories";
      const isSavingMemory = toolName === "addMemory";

      let Icon = Wrench;
      let label = `Using ${toolName}...`;

      if (isWebSearch) {
        Icon = Globe;
        label = "Searching the web...";
      } else if (isApiDebugger) {
        Icon = ArrowBigUp;
        label = "Hitting API's...";
      } else if (isFetchMemory) {
        Icon = Archive;
        label = "Fetching user preferences...";
      } else if (isSavingMemory) {
        Icon = ArchiveRestore;
        label = "Saving user preference...";
      } else if (isLiveUrlCrawling) {
        Icon = TextSelect;
        label = "Live crawling url...";
      } else if (isPricingSearch) {
        Icon = Banknote;
        label = "Fetching latest pricing...";
      }

      return {
        type: "tool",
        Icon,
        label,
        metadata: toolName,
      };
    }

    // Reasoning detection - works for OpenAI, Anthropic, DeepSeek, etc.
    if (isReasoningPart(part) && isActiveReasoning(part)) {
      return {
        type: "reasoning",
        Icon: Brain,
        label: "Reasoning...",
      };
    }
  }

  return {
    type: "thinking",
    Icon: LoaderPinwheel,
    label: "Thinking...",
  };
};

interface MessageAreaProps {
  messages: ChatMessageType[];
}

export default function MessageAreaComponent({ messages }: MessageAreaProps) {
  const thinking = useChatStore((s) => s.thinking);
  const error = useChatStore((s) => s.error);

  const indicatorState = useMemo(() => getIndicatorState(messages), [messages]);

  const hasStreamingText = useMemo(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return false;

    return lastMsg.parts.some((part) => {
      if (part.type === "text") {
        const text = (part as { text?: string }).text;
        return text && text.trim().length > 0;
      }
      return false;
    });
  }, [messages]);

  const shouldShowIndicator = thinking && !hasStreamingText;

  function isUserOrAssistant(
    msg: ChatMessageType
  ): msg is ChatMessageType & { role: "user" | "assistant" } {
    return msg.role === "user" || msg.role === "assistant";
  }

  const filteredMessages = messages.filter(isUserOrAssistant);

  const lastUserMessageIndex = filteredMessages.reduce(
    (lastIndex, msg, index) => {
      return msg.role === "user" ? index : lastIndex;
    },
    -1
  );

  return (
    <Conversation className="w-full h-full flex-1 relative">
      <ConversationContent className="flex flex-col pt-9 lg:pt-0 w-full">
        {filteredMessages.map((msg, index) => {
          return (
            <div key={`${msg.id ?? "msg"}-${index}`} className="relative">
              {msg.role === "user" ? (
                <MessageBubble msg={msg} />
              ) : (
                <div className="w-full max-w-[95vw] lg:max-w-[55vw] box-border mx-auto">
                  <Message from={msg.role}>
                    <MessageContent>
                      {msg.parts.map((part, partIndex) => {
                        if (part.type === "text") {
                          const text = (part as { text?: string }).text;
                          return (
                            text && (
                              <Response key={`text-${partIndex}`}>
                                {text}
                              </Response>
                            )
                          );
                        }
                        return null;
                      })}
                    </MessageContent>
                  </Message>
                </div>
              )}

              {/* Clean indicator - no reasoning text */}
              {shouldShowIndicator && index === lastUserMessageIndex && (
                <div className="mx-auto max-w-[95vw] lg:max-w-[55vw] px-7">
                  <div
                    className="bg-background/50 border-2 border-input gap-3 p-3 px-4 rounded-3xl shadow-lg

                   shadow-background/30 text-sm w-fit"
                  >
                    <div className="flex items-center gap-2">
                      <indicatorState.Icon className="size-5 animate-pulse flex-shrink-0" />
                      <Shimmer>{indicatorState.label}</Shimmer>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
