'use client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { SyncClientSession } from '@/lib/actions/chatSession-action';
import { useChatStore } from '@/lib/store/useChatStore';
import { usePayloadStore } from '@/lib/store/usePayloadStore';
import { useUserProfileStore } from '@/lib/store/useUserProfileStore';
import { generateClientSessionId, isValidSessionId } from '@/lib/utils';
import { sanitizeText } from '@/lib/utils/sanitize';
import { Forward, Frame, MessageCircleMore, Sparkles, SquareDashed } from 'lucide-react';
import { motion } from 'motion/react';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { toast } from 'sonner';
import { InputBoxSkeleton } from './input-box-skeleton';
import SendButton from './send-button';

const MODELS = [
  { value: 'auto', label: 'Auto', icon: Sparkles },
  {
    value: 'anthropic/claude-opus-4.5',
    label: 'Claude Opus 4.5',
    icon: Sparkles,
  },
  {
    value: 'anthropic/claude-sonnet-4.5',
    label: 'Claude Sonnet 4.5',
    icon: Sparkles,
  },
  {
    value: 'anthropic/claude-haiku-4.5',
    label: 'Claude Haiku 4.5',
    icon: Sparkles,
  },
  {
    value: 'anthropic/claude-3-haiku',
    label: 'Claude Haiku 3',
    icon: Sparkles,
  },
] as const;

type ModelValue = (typeof MODELS)[number]['value'];

function MainInputBox({
  sendMessage,
  status,
  stopResponse,
  disabled = false,
  loading = false,
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

  // Global state for model and chatMode
  const globalModel = usePayloadStore((s) => s.model);
  const globalChatMode = usePayloadStore((s) => s.chatMode);
  const setGlobalModel = usePayloadStore((s) => s.setModel);
  const setGlobalChatMode = usePayloadStore((s) => s.setChatMode);

  // Agent mode toggle state - synced with global store
  const [agentMode, setAgentMode] = useState(globalChatMode === 'agent');

  // Model selection state - synced with global store
  const [selectedModel, setSelectedModel] = useState<ModelValue>(
    (globalModel as ModelValue) || 'auto'
  );

  const profile = useUserProfileStore((s) => s.profile);
  const profileLoading = useUserProfileStore((s) => s.isLoading);

  const isReady = (!status || status === 'ready') && !disabled;
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [path]);

  // Sync local state with global store whenever they change
  useEffect(() => {
    const newChatMode = agentMode ? 'agent' : 'simple';
    if (newChatMode !== globalChatMode) {
      setGlobalChatMode(newChatMode);
    }
  }, [agentMode, globalChatMode, setGlobalChatMode]);

  useEffect(() => {
    if (selectedModel !== globalModel) {
      setGlobalModel(selectedModel);
    }
  }, [selectedModel, globalModel, setGlobalModel]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isReady || isNavigating || disabled || prompt.trim().length === 0) return;

      if (path === '/') {
        setIsNavigating(true);

        try {
          const clientSessionId = generateClientSessionId();
          const title = sanitizeText(prompt.slice(0, 80)) || 'New Chat';

          if (!isValidSessionId(clientSessionId)) {
            toast.error('Invalid session ID generated');
            setIsNavigating(false);
            return;
          }

          const sanitizedPrompt = sanitizeText(prompt);
          const messageOptions = {
            body: {
              chatMode: globalChatMode,
              model: globalModel,
            },
          };

          setPrompt(sanitizedPrompt);
          setCurrentSessionId(clientSessionId);
          router.replace(`c/${clientSessionId}`);

          // Send message immediately after navigation with model and chatMode
          if (sendMessage) {
            // Small delay to ensure navigation completes
            setTimeout(() => {
              sendMessage({ text: sanitizedPrompt }, messageOptions);
              setPrompt('');
            }, 100);
          }

          // Background sync - don't await
          SyncClientSession({ sessionId: clientSessionId, title }).catch(() => {
            toast.info('Background sync failed!');
          });
        } catch (error) {
          toast.error('Failed to create chat session');
          setIsNavigating(false);
        }
        return;
      }

      // Send message with chat mode AND model selection
      if (sendMessage) {
        sendMessage(
          { text: prompt },
          {
            body: {
              chatMode: globalChatMode,
              model: globalModel, // Always has value, defaults to "auto"
            },
          }
        );
        setPrompt('');
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
      globalChatMode,
      globalModel,
    ]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.ctrlKey) {
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

  const placeholderText = disabled ? 'Chat is currently unavailable' : 'Ask anything...';

  return (
    <motion.form
      transition={{ duration: 0.2 }}
      layout
      onSubmit={handleSubmit}
      className={`w-[96vw] origin-center  lg:max-w-[50vw] mx-auto shadow-md shadow-background/50
                 h-fit flex p-2 gap-2 border-2 items-center bg-sidebar ${
                   disabled ? 'cursor-not-allowed' : ''
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

      {/* Agent Mode Toggle */}
      <div className="flex h-full items-center">
        <Toggle
          aria-label="Toggle agent mode"
          size="lg"
          variant="outline"
          pressed={agentMode}
          onPressedChange={setAgentMode}
          disabled={disabled}
          className="data-[state=on]:bg-input/30 data-[state=on]:hover:bg-input/50
                     data-[state=off]:bg-input/30 data-[state=off]:hover:bg-input/50  border-2
                     transition-all duration-200 cursor-pointer "
        >
          {agentMode ? (
            <div className="flex px-1 gap-1 items-center">
              <Frame className="size-5 text-purple-500" />
              <span className="text-sm text-purple-500 font-medium">Agent</span>
            </div>
          ) : (
            <div className="flex px-1 gap-1 items-center">
              <MessageCircleMore className="size-5 text-blue-500" />
              <span className="text-sm text-blue-500 font-medium">Chat</span>
            </div>
          )}
        </Toggle>
      </div>
      {/* Model Selector - Clean */}
      <div className="flex h-full items-center">
        <Select
          value={selectedModel}
          onValueChange={(value: ModelValue) => setSelectedModel(value)}
          disabled={disabled}
        >
          <SelectTrigger
            className={`h-full  data-[size=default]:h-10 border-2 rounded-none  cursor-pointer`}
          >
            <Sparkles className={`size-4  `} />
          </SelectTrigger>
          <SelectContent className=" border-2 bg-background/70 backdrop-blur-lg  ">
            {MODELS.map((model) => (
              <SelectItem
                key={model.value}
                value={model.value}
                className="cursor-pointer  hover:bg-accent/30   rounded-none"
              >
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            className=" hover:shadow-sm disabled:opacity-100 hover:shadow-foreground/5 duration-300 !h-full cursor-pointer !border-2"
            props={{
              type: 'submit',
              disabled: !isReady || prompt.length === 0 || isNavigating || disabled,
            }}
          >
            <Forward className="size-6 text-blue-700" />
          </SendButton>
        ) : (
          <Button
            variant="outline"
            className="hover:text-red-600 bg-accent border-2 h-full text-white
                       hover:bg-red-500  cursor-pointer hover:scale-105 duration-300"
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
