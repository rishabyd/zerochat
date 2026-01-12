"use client";

import { Forward, Globe, Sparkles, SquareDashed } from "lucide-react";
import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle"; // Changed from Switch to Toggle
import { SyncClientSession } from "@/lib/actions/chatSession-action";
import { useChatStore } from "@/lib/store/useChatStore";
import { usePayloadStore } from "@/lib/store/usePayloadStore";
import { useUserProfileStore } from "@/lib/store/useUserProfileStore";
import { generateClientSessionId, isValidSessionId } from "@/lib/utils";
import { sanitizeText } from "@/lib/utils/sanitize";
import { InputBoxSkeleton } from "./input-box-skeleton";
import SendButton from "./send-button";

const MODELS = [
  {
    value: "anthropic/claude-opus-4.5",
    label: "Claude Opus 4.5",
    icon: Sparkles,
  },
  {
    value: "google/gemini-3-pro-preview",
    label: "Gemini 3 Pro",
    icon: Sparkles,
  },
  {
    value: "google/gemini-3-flash",
    label: "Gemini 3 Flash",
    icon: Sparkles,
  },
  {
    value: "google/gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    icon: Sparkles,
  },
  {
    value: "zai/glm-4.7",
    label: "GLM 4.7",
    icon: Sparkles,
  },
] as const;

type ModelValue = (typeof MODELS)[number]["value"];

function MainInputBox({
  sendMessage,
  status,
  stopResponse,
  disabled = false,
}: {
  sendMessage?: (message: { text: string }, options?: { body?: Record<string, unknown> }) => void;
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

  // Global state for model
  const globalModel = usePayloadStore((s) => s.model);
  const setGlobalModel = usePayloadStore((s) => s.setModel);

  // Web Search State - using global store
  const globalWebSearch = usePayloadStore((s) => s.webSearch);
  const setGlobalWebSearch = usePayloadStore((s) => s.setWebSearch);

  // Model selection state - synced with global store
  const [selectedModel, setSelectedModel] = useState<ModelValue>(
    (globalModel as ModelValue) || "auto",
  );

  const profile = useUserProfileStore((s) => s.profile);
  const profileLoading = useUserProfileStore((s) => s.isLoading);

  const isReady = (!status || status === "ready") && !disabled;
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, []);

  useEffect(() => {
    if (selectedModel !== globalModel) {
      setGlobalModel(selectedModel);
    }
  }, [selectedModel, globalModel, setGlobalModel]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isReady || isNavigating || disabled || prompt.trim().length === 0) return;

      // Prepare body options including Web Search toggle
      const messageOptions = {
        body: {
          model: globalModel,
          webSearch: globalWebSearch, // Passing web toggle state
        },
      };

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

          const sanitizedPrompt = sanitizeText(prompt);

          setPrompt(sanitizedPrompt);
          setCurrentSessionId(clientSessionId);
          router.replace(`c/${clientSessionId}`);

          // Send message immediately after navigation
          if (sendMessage) {
            setTimeout(() => {
              sendMessage({ text: sanitizedPrompt }, messageOptions);
              setPrompt("");
            }, 100);
          }

          // Background sync
          SyncClientSession({ sessionId: clientSessionId, title }).catch(() => {
            toast.info("Background sync failed!");
          });
        } catch (_error) {
          toast.error("Failed to create chat session");
          setIsNavigating(false);
        }
        return;
      }

      // Send message in existing chat
      if (sendMessage) {
        sendMessage({ text: prompt }, messageOptions);
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
      globalModel,
      globalWebSearch,
    ],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.ctrlKey) {
        e.preventDefault();
        if (!disabled) handleSubmit(e);
      }
    },
    [disabled, handleSubmit],
  );

  const handleStop = useCallback(() => {
    setThinking(false);
    stopResponse?.();
  }, [setThinking, stopResponse]);

  if (profileLoading || (!profile && !profileLoading)) {
    return <InputBoxSkeleton />;
  }

  const placeholderText = disabled ? "Chat is currently unavailable" : "Ask anything...";

  // Helper to get the display label
  const activeModelLabel = MODELS.find((m) => m.value === selectedModel)?.label || selectedModel;

  return (
    <motion.form
      transition={{ duration: 0.2 }}
      layout
      onSubmit={handleSubmit}
      className={`mx-auto flex h-fit w-[96vw] origin-center items-center gap-2 border-2 bg-sidebar p-2 shadow-background/50 shadow-md lg:max-w-[50vw] ${
        disabled ? "cursor-not-allowed" : ""
      }`}
    >
      <TextareaAutosize
        placeholder={placeholderText}
        autoFocus={!disabled}
        onKeyDown={handleKeyDown}
        className="scrollbar-thumb-accent scrollbar-thin h-full max-h-40 min-h-11 w-full resize-none place-content-center border-0 bg-transparent px-2 pl-3 leading-tight placeholder:text-primary placeholder:opacity-70 focus:outline-none focus-visible:ring-0"
        value={prompt}
        onChange={(e) => !disabled && setPrompt(e.target.value)}
        maxRows={6}
        minRows={1}
        disabled={disabled}
      />

      {/* Model Selector */}
      <div className="flex h-full items-center">
        <Select
          value={selectedModel}
          onValueChange={(value: ModelValue) => setSelectedModel(value)}
          disabled={disabled}
        >
          <SelectTrigger className="h-10 min-w-[140px] cursor-pointer rounded-none border-2 px-3 font-medium text-sm">
            <span className="truncate">{activeModelLabel}</span>
          </SelectTrigger>
          <SelectContent className="border-2 bg-background/70 backdrop-blur-lg">
            {MODELS.map((model) => (
              <SelectItem
                key={model.value}
                value={model.value}
                className="cursor-pointer rounded-none hover:bg-accent/30"
              >
                <div className="flex items-center gap-2">
                  <model.icon className="size-4" />
                  <span>{model.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Web Toggle Button */}
      <div className="flex h-full items-center">
        <Toggle
          pressed={globalWebSearch}
          onPressedChange={setGlobalWebSearch}
          disabled={disabled}
          variant="outline"
          aria-label="Toggle Web Search"
          className={`cursor-pointer`}
        >
          <Globe className={`size-5 ${globalWebSearch ? "text-blue-600" : ""}`} />
        </Toggle>
      </div>

      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="my-auto"
      >
        {isReady ? (
          <SendButton
            className="!h-10 !border-2 cursor-pointer duration-300 hover:shadow-foreground/5 hover:shadow-sm disabled:opacity-100"
            props={{
              type: "submit",
              disabled: !isReady || prompt.length === 0 || isNavigating || disabled,
            }}
          >
            <Forward className="size-6 text-blue-700" />
          </SendButton>
        ) : (
          <Button
            variant="outline"
            className="h-10 cursor-pointer border-2 bg-accent text-white duration-300 hover:scale-105 hover:bg-red-500 hover:text-red-600"
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
