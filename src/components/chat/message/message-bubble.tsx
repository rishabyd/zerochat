"use client";

import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UIDataTypes, UIMessage, UITools } from "ai";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

const MOBILE_BREAKPOINT = 768; // Mobile breakpoint in pixels

// Type definitions for message handling
type AllowedUIMessage = UIMessage<unknown, UIDataTypes, UITools> & {
  role: "user" | "assistant";
};

interface MessageBubbleProps {
  msg: AllowedUIMessage; // Message data to display
}

/**
 * MessageBubble component that renders user and assistant messages
 * with proper styling and markdown support for assistant messages
 */
export default function MessageBubble({ msg }: MessageBubbleProps) {
  const isUser = msg.role === "user"; // Determine if message is from user
  const [isExpanded, setIsExpanded] = useState(false); // Control message expansion state

  // Extract text content from message parts for display
  const text = useMemo(() => {
    return msg.parts
      .filter((part) => part.type === "text") // Filter only text parts
      .map((part) => {
        if (part.type === "text") {
          return String(part.text ?? ""); // Convert text to string safely
        }
        return "";
      })
      .join("\n"); // Join multiple text parts with newlines
  }, [msg.parts]);

  // Check if message is long enough to need expansion toggle
  const isLongMessage = useMemo(() => {
    return text.split("\n").length > 3; // Show expansion if more than 3 lines
  }, [text]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.3,
        ease: "easeInOut",
      }}
      className="w-full max-w-[95vw] lg:max-w-[55vw] box-border mx-auto mb-4"
    >
      <Message from={msg.role}>
        <MessageContent>
          {isUser ? (
            <div className="relative">
              <p
                className={cn(
                  "whitespace-pre-wrap leading-5",
                  !isExpanded && isLongMessage && "line-clamp-3"
                )}
              >
                {text}
              </p>
              <div className="flex justify-center">
                {isLongMessage && (
                  <Button
                    onClick={() => setIsExpanded(!isExpanded)}
                    variant="secondary"
                    size="sm"
                    className="cursor-pointer mt-2 mx-auto text-xs rounded-none border transition-colors"
                  >
                    {isExpanded ? "Show less" : "Show more"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            text.trim() && <Response>{text}</Response>
          )}
        </MessageContent>
      </Message>
    </motion.div>
  );
}
