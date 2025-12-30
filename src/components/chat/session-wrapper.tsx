"use client";

import { fetcher } from "@/lib/fetcher";
import { useChatStore } from "@/lib/store/useChatStore";
import { useUserProfileStore } from "@/lib/store/useUserProfileStore";
import { isValidSessionId } from "@/lib/utils";
import { UIDataTypes, UIMessage, UITools } from "ai";
import { useEffect } from "react";
import useSWRImmutable from "swr/immutable";
import { Button } from "../ui/button";
import Chatscreen from "./chatscreen";
interface SessionWrapperProps {
  sessionId: string;
  initialMessages?: UIMessage<unknown, UIDataTypes, UITools>[];
}
export default function SessionWrapper({
  sessionId,
  initialMessages = [],
}: SessionWrapperProps) {
  const setCurrentSessionId = useChatStore((e) => e.setCurrentSessionId);
  const fetchProfile = useUserProfileStore((s) => s.fetchProfile);
  const profile = useUserProfileStore((s) => s.profile);

  const { data, error, mutate } = useSWRImmutable(
    isValidSessionId(sessionId) ? `/api/sessions/${sessionId}` : null,
    fetcher,
    { fallbackData: { messages: initialMessages } },
  );

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, [profile, fetchProfile]);

  useEffect(() => {
    setCurrentSessionId(sessionId);
  }, [sessionId, setCurrentSessionId]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-600 dark:text-red-400 mb-2">
            {`Failed to load session or session doesn't exist!`}
          </p>
          <div className={`flex gap-2`}>
            <Button onClick={() => mutate()} className="px-4 py-2">
              Retry
            </Button>
            <Button
              onClick={() => (window.location.href = "/")}
              className="px-4 py-2"
            >
              Return to Chat
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Chatscreen
      sessionId={sessionId}
      seedMessages={data.messages}
      isClientSession={!data.messages}
    />
  );
}
