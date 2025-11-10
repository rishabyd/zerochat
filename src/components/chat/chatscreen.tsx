"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { handleClientError } from "@/lib/services/errors";
import { useChatStore } from "@/lib/store/useChatStore";
import { usePayloadStore } from "@/lib/store/usePayloadStore";
import { generateMessageId } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import type { UIDataTypes, UIMessage, UITools } from "ai";
import { DefaultChatTransport } from "ai";
import { Plus } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import MainInputBox from "./InputBox/input-box";
import MessageArea from "./message/message-area";

const transport = new DefaultChatTransport({ api: "/api/chat" });

function ChatPage({
  sessionId,
  seedMessages,
  isClientSession = false,
}: {
  sessionId: string;
  seedMessages?: UIMessage<unknown, UIDataTypes, UITools>[];
  isClientSession?: boolean;
}) {
  const router = useRouter();

  const setThinking = useChatStore((state) => state.setThinking);
  // const setError = useChatStore((state) => state.setError);
  const setStopResponse = useChatStore((state) => state.setStopResponse);

  const initialPrompt = usePayloadStore((state) => state.prompt);
  const setPrompt = usePayloadStore((state) => state.setPrompt);

  const Transport = useMemo(() => transport, []);

  const { sendMessage, status, messages, error, stop } = useChat({
    transport: Transport,
    id: sessionId,
    onError: (e: Error) => {
      handleClientError(e);
      setStopResponse(false);
      setThinking(false);
    },
    onFinish: () => {
      setStopResponse(false);
      setThinking(false);
    },
  });

  const displayMessages = useMemo(() => {
    if (!seedMessages?.length) return messages;

    const allMessages = [...seedMessages, ...messages];
    const seenIds = new Set(); // Track IDs we've already seen

    return allMessages.filter((message) => {
      // Skip if we've seen this ID before
      if (seenIds.has(message.id)) return false;

      // Remember this ID and keep the message
      seenIds.add(message.id);
      return true;
    });
  }, [seedMessages, messages]);

  const createUserMessage = useCallback(
    (text: string): UIMessage<unknown, UIDataTypes, UITools> => ({
      id: generateMessageId(),
      role: "user" as const,
      parts: [{ type: "text", text }],
    }),
    []
  );

  const sendWithSession = useCallback(
    (
      message: { text: string },
      options?: { body?: Record<string, unknown> }
    ) => {
      return sendMessage(message, {
        body: {
          ...(options?.body || {}),
          sessionId,
          currentMessage: createUserMessage(message.text),
        },
      });
    },
    [sendMessage, sessionId, createUserMessage]
  );

  const memoizedStop = useCallback(() => stop(), [stop]);

  // Track if auto-send has already been triggered to prevent duplicate sends
  const hasAutoSentRef = useRef(false);
  useEffect(() => {
    if (hasAutoSentRef.current) return; // Already auto-sent, don't repeat
    if (!initialPrompt) return; // No initial prompt to send
    if (status !== "ready") return; // Chat not ready yet

    // Check if this is an existing session with messages - if so, don't auto-send
    const hasExistingMessages =
      (seedMessages && seedMessages.length > 0) || messages.length > 0;

    if (hasExistingMessages) {
      hasAutoSentRef.current = true; // Mark as sent to prevent auto-send in existing sessions
      setPrompt(""); // Clear the initial prompt to prevent issues
      return;
    }

    // Only auto-send if we have a valid session, are ready, and this is a new session
    if (sessionId && status === "ready") {
      hasAutoSentRef.current = true; // Mark as sent to prevent duplicates
      const text = initialPrompt;
      setPrompt(""); // Clear prompt after sending

      // Send immediately for new sessions
      sendWithSession({ text });
    }
  }, [
    setPrompt,
    initialPrompt,
    status,
    messages.length,
    sendWithSession,
    sessionId,
    seedMessages,
  ]);

  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      setStopResponse(true);
      setThinking(true);
    } else {
      setStopResponse(false);
      setThinking(false);
    }
  }, [status, setStopResponse, setThinking]);

  useEffect(() => {
    if (!error) return;

    if (error.message.includes("limit") || error.message.includes("429")) {
      toast.error(
        "📊 You've reached your usage limit. Please upgrade to PRO for higher limits."
      );
      router.push("/");
    }
  }, [error, router]);

  return (
    <div className="fixed inset-0 bg-input overflow-hidden flex flex-col md:relative md:h-full scrollbar-none">
      {/* Mobile Top Bar */}
      <div className="flex-shrink-0 bg-sidebar border-b border-border md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="p-2 hover:bg-accent rounded-lg transition-colors" />
            <div className="flex flex-col">
              <h1 className="text-sm font-medium truncate">Chat Session</h1>
              {isClientSession && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Syncing...</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              aria-label="New chat"
            >
              <Link href="/">
                <Plus className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <MessageArea messages={displayMessages} />
      </div>

      <motion.div className="flex-shrink-0 mx-auto pb-2 lg:pb-4">
        <MainInputBox
          stopResponse={memoizedStop}
          sendMessage={sendWithSession}
          status={status}
        />
      </motion.div>
    </div>
  );
}

export default React.memo(ChatPage);
