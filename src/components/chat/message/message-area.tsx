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
  ArrowBigUp,
  Banknote,
  Brain,
  ChevronDown,
  Globe,
  LoaderPinwheel,
  TextSelect,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import MessageBubble from "./message-bubble";

export type ChatMessageType = UIMessage<unknown, UIDataTypes, UITools>;

type MessagePart = ChatMessageType["parts"] extends Array<infer P> ? P : never;

type ReasoningPart = MessagePart & {
  type: "reasoning";
  text?: string;
  state?: string;
  reasoning?: {
    state?: string;
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
  if (part.state) {
    return REASONING_ACTIVE_STATES.some((state) =>
      part.state!.toLowerCase().includes(state)
    );
  }
  if (part.reasoning?.state) {
    return REASONING_ACTIVE_STATES.some((state) =>
      part.reasoning!.state!.toLowerCase().includes(state)
    );
  }
  return !part.text || part.text.trim().length === 0;
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

type StatusIndicatorState = {
  type: "reasoning" | "tool" | "thinking";
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  metadata?: string;
  streamingContent?: string;
  completedReasoningBlocks?: string[]; // All completed reasoning chunks
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

  const completedReasoningBlocks: string[] = [];
  let activeReasoningContent: string | undefined;

  for (const part of lastMsg.parts ?? []) {
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

      let Icon = Wrench;
      let label = `Using ${toolName}...`;

      if (isWebSearch) {
        Icon = Globe;
        label = "Searching the web...";
      } else if (isApiDebugger) {
        Icon = ArrowBigUp;
        label = "Hitting API's...";
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

    // Collect all reasoning blocks (active + completed)
    if (isReasoningPart(part)) {
      const reasoningText = extractTextFromPart(part);
      if (reasoningText && reasoningText.trim().length > 0) {
        if (isActiveReasoning(part)) {
          activeReasoningContent = reasoningText;
        } else {
          completedReasoningBlocks.push(reasoningText);
        }
      }
    }
  }

  // If there's active reasoning, show it
  if (activeReasoningContent !== undefined) {
    return {
      type: "reasoning",
      Icon: Brain,
      label: "Reasoning...",
      streamingContent: activeReasoningContent,
      completedReasoningBlocks,
    };
  }

  return {
    type: "thinking",
    Icon: LoaderPinwheel,
    label: "Thinking...",
    completedReasoningBlocks,
  };
};

interface MessageAreaProps {
  messages: ChatMessageType[];
}

export default function MessageAreaComponent({ messages }: MessageAreaProps) {
  const thinking = useChatStore((s) => s.thinking);
  const error = useChatStore((s) => s.error);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);

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
          const isLastMessage = index === filteredMessages.length - 1;

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
                          const textContent = extractTextFromPart(part);
                          return (
                            textContent && (
                              <Response key={`text-${partIndex}`}>
                                {textContent}
                              </Response>
                            )
                          );
                        }

                        // Skip ALL reasoning rendering in message flow - goes to indicator only
                        if (part.type === "reasoning") {
                          return null;
                        }

                        return null;
                      })}
                    </MessageContent>
                  </Message>
                </div>
              )}

              {/* UNIFIED STATUS INDICATOR - handles everything */}
              {shouldShowIndicator && index === lastUserMessageIndex && (
                <div className="mx-auto max-w-[95vw] lg:max-w-[55vw] px-7">
                  <div className="bg-background/25 gap-3 p-3 px-4 rounded-lg text-sm transition-opacity duration-100 w-fit max-w-lg">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <indicatorState.Icon className="size-5 animate-pulse flex-shrink-0" />
                      <Shimmer>{indicatorState.label}</Shimmer>
                    </div>

                    {/* Active streaming reasoning - FULL TEXT, NO CLAMP */}
                    {indicatorState.streamingContent && (
                      <div className="text-xs text-muted-foreground mt-2 pl-7 border-l border-muted-foreground/30 italic max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                        {indicatorState.streamingContent}
                      </div>
                    )}

                    {/* Completed reasoning toggle */}
                    {indicatorState.completedReasoningBlocks &&
                      indicatorState.completedReasoningBlocks.length > 0 && (
                        <button
                          onClick={() =>
                            setReasoningExpanded(!reasoningExpanded)
                          }
                          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pl-7"
                        >
                          <ChevronDown
                            className={`size-4 transition-transform ${
                              reasoningExpanded ? "rotate-180" : ""
                            }`}
                          />
                          <span>
                            {indicatorState.completedReasoningBlocks.length}{" "}
                            reasoning block
                            {indicatorState.completedReasoningBlocks.length > 1
                              ? "s"
                              : ""}
                          </span>
                        </button>
                      )}

                    {/* Expanded completed reasoning - FULL TEXT, NO CLAMP */}
                    {reasoningExpanded &&
                      indicatorState.completedReasoningBlocks && (
                        <div className="mt-2 space-y-3 pl-7 border-l border-muted-foreground/30">
                          {indicatorState.completedReasoningBlocks.map(
                            (block, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-muted-foreground max-h-60 overflow-y-auto whitespace-pre-wrap break-words"
                              >
                                {block}
                              </div>
                            )
                          )}
                        </div>
                      )}
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
