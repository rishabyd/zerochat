'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  isGatewayKeyUnavailable,
  useGatewayKeyStatus,
} from '@/hooks/use-gateway-key-status';
import { handleClientError } from '@/lib/services/errors';
import { useChatStore } from '@/lib/store/useChatStore';
import { usePayloadStore } from '@/lib/store/usePayloadStore';
import { generateMessageId } from '@/lib/utils';
import { useChat } from '@ai-sdk/react';
import type { UIDataTypes, UIMessage, UITools } from 'ai';
import { DefaultChatTransport } from 'ai';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '../ui/button';
import MainInputBox from './InputBox/input-box';
import MessageArea from './message/message-area';

const transport = new DefaultChatTransport({ api: '/api/chat' });

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
  const globalModel = usePayloadStore((state) => state.model);
  const globalChatMode = usePayloadStore((state) => state.chatMode);
  const { data: gatewayKeyStatus, error: gatewayKeyError, isLoading: gatewayKeyLoading } =
    useGatewayKeyStatus();
  const gatewayKeyUnavailable = isGatewayKeyUnavailable(
    gatewayKeyStatus,
    gatewayKeyLoading,
    gatewayKeyError
  );

  const Transport = useMemo(() => transport, []);

  const cleanup = () => {
    setStopResponse(false);
    setThinking(false);
  };

  const { sendMessage, status, messages, error, stop } = useChat({
    transport: Transport,
    id: sessionId,
    experimental_throttle: 100,
    onError: (e: Error) => {
      handleClientError(e);
      cleanup();
    },
    onFinish: cleanup,
  });

  const displayMessages = useMemo(() => {
    if (!seedMessages?.length) return messages;
    if (!messages.length) return seedMessages;
    const messageMap = new Map<string, UIMessage<unknown, UIDataTypes, UITools>>();

    seedMessages.forEach((msg) => {
      if (msg.id) {
        messageMap.set(msg.id, msg);
      }
    });

    messages.forEach((msg) => {
      if (msg.id) {
        messageMap.set(msg.id, msg);
      }
    });

    return Array.from(messageMap.values());
  }, [seedMessages, messages]);

  const createUserMessage = useCallback(
    (text: string): UIMessage<unknown, UIDataTypes, UITools> => ({
      id: generateMessageId(),
      role: 'user' as const,
      parts: [{ type: 'text', text }],
    }),
    []
  );

  const sendWithSession = useCallback(
    (message: { text: string }, options?: { body?: Record<string, unknown> }) => {
      return sendMessage(message, {
        body: {
          chatMode: globalChatMode || 'agent',
          model: globalModel || 'auto',
          ...(options?.body || {}),
          sessionId,
          currentMessage: createUserMessage(message.text),
        },
      });
    },
    [sendMessage, sessionId, createUserMessage, globalChatMode, globalModel]
  );

  const memoizedStop = useCallback(() => stop(), [stop]);

  const hasAutoSentRef = useRef(false);
  useEffect(() => {
    if (hasAutoSentRef.current) return;
    if (!initialPrompt) return;
    if (status !== 'ready') return;
    if (gatewayKeyUnavailable) return;

    const hasExistingMessages = (seedMessages && seedMessages.length > 0) || messages.length > 0;

    if (hasExistingMessages) {
      hasAutoSentRef.current = true;
      setPrompt('');
      return;
    }

    if (sessionId && status === 'ready') {
      hasAutoSentRef.current = true;
      const text = initialPrompt;
      setPrompt('');
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
    gatewayKeyUnavailable,
  ]);

  useEffect(() => {
    if (status === 'submitted' || status === 'streaming') {
      setStopResponse(true);
      setThinking(true);
    } else {
      setStopResponse(false);
      setThinking(false);
    }
  }, [status, setStopResponse, setThinking]);

  return (
    <div className="fixed inset-0 bg-input overflow-hidden flex flex-col md:relative md:h-full scrollbar-none">
      {/* Mobile Top Bar */}
      <div className="shrink-0 bg-sidebar border-b border-border md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="p-2 hover:bg-accent rounded-none transition-colors" />
            <div className="flex flex-col">
              <h1 className="text-sm font-medium truncate">Chat Session</h1>
              {isClientSession && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-foreground rounded-none animate-pulse"></div>
                  <span>Syncing...</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              className="p-2 hover:bg-accent rounded-none transition-colors"
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

      <motion.div className="shrink-0 mx-auto pb-2 lg:pb-4">
        <MainInputBox stopResponse={memoizedStop} sendMessage={sendWithSession} status={status} />
      </motion.div>
    </div>
  );
}

export default React.memo(ChatPage);
