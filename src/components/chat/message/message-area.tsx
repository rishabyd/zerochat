"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { useChatStore } from "@/lib/store/useChatStore";
import type { UIDataTypes, UIMessage, UITools } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import MessageBubble from "./message-bubble";
import { LoaderPinwheel } from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";

export type ChatMessageType = UIMessage<unknown, UIDataTypes, UITools>;

interface MessageAreaProps {
  messages: ChatMessageType[]; // Array of chat messages to display
}

function MessageAreaComponent({ messages }: MessageAreaProps) {
  const thinking = useChatStore((s) => s.thinking); // Get thinking state for AI processing indicator
  const error = useChatStore((s) => s.error); // Get error state for error display

  // Type guard to ensure message has valid user/assistant role for proper rendering
  function isUserOrAssistant(
    msg: ChatMessageType
  ): msg is ChatMessageType & { role: "user" | "assistant" } {
    return msg.role === "user" || msg.role === "assistant";
  }

  return (
    <Conversation className="w-full h-full flex-1 relative">
      <ConversationContent className="flex flex-col pt-9 lg:pt-6 w-full">
        {/* Render filtered messages with proper keys for React reconciliation */}
        {messages.filter(isUserOrAssistant).map((msg, index) => (
          <MessageBubble key={`${msg.id ?? "msg"}-${index}`} msg={msg} />
        ))}
        {/* Animated thinking indicator when AI is processing user input */}
        <AnimatePresence>
          {thinking && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0,  }}
              animate={{ opacity: 1, scaleX: 1, }}
              transition={{ duration: 0.5 }}
              className="mx-auto w-full origin-left max-w-[95vw] flex items-center  gap-1 lg:max-w-[55vw] py-3 pb-7 px-7"
            >
              <LoaderPinwheel className="size-6 animate-spin"/>
            <Shimmer className="text-lg">
              
              Thinking...</Shimmer>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Error display when chat encounters problems with user-friendly message */}
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

export default memo(MessageAreaComponent);
