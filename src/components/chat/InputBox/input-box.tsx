"use client";
import { Button } from "@/components/ui/button";
import { SyncClientSession } from "@/lib/actions/chatSession-action";
import { useChatStore } from "@/lib/store/useChatStore";
import { usePayloadStore } from "@/lib/store/usePayloadStore";
import { useUserProfileStore } from "@/lib/store/useUserProfileStore";
import { generateClientSessionId, isValidSessionId } from "@/lib/utils";
import { sanitizeText } from "@/lib/utils/sanitize";
import { Forward, SquareDashed } from "lucide-react";
import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { InputBoxSkeleton } from "./input-box-skeleton";
import SendButton from "./send-button";

function MainInputBox({
  sendMessage,
  status,
  stopResponse,
  disabled = false,
  loading = false,
}: {
  sendMessage?: (
    message: { text: string },
    options?: { body?: Record<string, unknown> }
  ) => void;
  status?: string;
  stopResponse?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const path = usePathname();
  const router = useRouter();

  // Store selectors
  const prompt = usePayloadStore((s) => s.prompt);
  const setPrompt = usePayloadStore((s) => s.setPrompt);
  const setThinking = useChatStore((s) => s.setThinking);
  const setCurrentSessionId = useChatStore((s) => s.setCurrentSessionId);

  const profile = useUserProfileStore((s) => s.profile);

  const profileLoading = useUserProfileStore((s) => s.isLoading);

  const isReady = (!status || status === "ready") && !disabled;
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [path]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isReady || isNavigating || disabled || prompt.trim().length === 0)
        return;

      if (path === "/") {
        setIsNavigating(true);

        try {
          const clientSessionId = generateClientSessionId();
          const title = sanitizeText(prompt.slice(0, 80)) || "New Chat";

          if (!isValidSessionId(clientSessionId)) {
            toast.error("Invalid session ID generated");
            setIsNavigating(false);
            return;
          }

          setPrompt(sanitizeText(prompt));
          setCurrentSessionId(clientSessionId);
          router.replace(`/${clientSessionId}`);

          // Background sync - don't await
          SyncClientSession({ sessionId: clientSessionId, title }).catch(() => {
            toast.info("Background sync failed!");
          });
        } catch (error) {
          toast.error("Failed to create chat session");
          setIsNavigating(false);
        }
        return;
      }

      // Send message in existing session
      if (sendMessage) {
        sendMessage({ text: prompt });
        setPrompt("");
      }
    },
    [
      isReady,
      isNavigating,
      disabled,
      prompt,
      path,
      setPrompt,
      setCurrentSessionId,
      router,
      sendMessage,
    ]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.ctrlKey) {
        e.preventDefault();
        if (!disabled) handleSubmit(e);
      }
    },
    [disabled, handleSubmit]
  );

  const handleStop = useCallback(() => {
    setThinking(false);
    stopResponse?.();
  }, [setThinking, stopResponse]);

  if (profileLoading || (!profile && !profileLoading)) {
    return <InputBoxSkeleton />;
  }

  const placeholderText = disabled
    ? "Chat is currently unavailable"
    : "Ask anything";

  return (
    <motion.form
      transition={{ duration: 0.2 }}
      layout
      onSubmit={handleSubmit}
      className={`w-[96vw] origin-center rounded-3xl lg:max-w-[50vw] mx-auto shadow-md shadow-background/50
                 h-fit flex p-2 gap-2 border-2  bg-sidebar ${
                   disabled ? "cursor-not-allowed" : ""
                 }`}
    >
      <TextareaAutosize
        placeholder={placeholderText}
        autoFocus={!disabled}
        onKeyDown={handleKeyDown}
        className="w-full h-full scrollbar-thumb-accent scrollbar-thin border-0 resize-none max-h-40
                   placeholder:opacity-70 placeholder:text-primary bg-transparent min-h-11 px-2 pl-3
                   place-content-center leading-tight focus:outline-none focus-visible:ring-0"
        value={prompt}
        onChange={(e) => !disabled && setPrompt(e.target.value)}
        maxRows={6}
        minRows={1}
        disabled={disabled}
      />

      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="my-auto"
      >
        {isReady ? (
          <SendButton
            className="rounded-2xl hover:shadow-sm disabled:opacity-100 hover:shadow-foreground/5 duration-300 !h-full cursor-pointer !border-2"
            props={{
              type: "submit",
              disabled:
                !isReady || prompt.length === 0 || isNavigating || disabled,
            }}
          >
            <Forward className="size-6 text-blue-700" />
          </SendButton>
        ) : (
          <Button
            variant="outline"
            className="hover:text-red-600 bg-accent border-2 h-full text-white
                       hover:bg-red-500 rounded-2xl cursor-pointer hover:scale-105 duration-300"
            onClick={handleStop}
            disabled={disabled}
          >
            <SquareDashed className="size-5" />
          </Button>
        )}
      </motion.div>
    </motion.form>
  );
}

export default React.memo(MainInputBox);
export { InputBoxSkeleton };
