'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { KeyRound, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export function GatewayKeyBanner({
  hasKey,
  error,
  onRetry,
}: {
  hasKey: boolean | undefined;
  error?: unknown;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <Alert
        variant="destructive"
        className="mx-auto !flex w-[96vw] flex-wrap items-center gap-3 px-3 py-2 lg:max-w-[55vw]"
      >
        <KeyRound className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <AlertTitle>Unable to verify API key</AlertTitle>
          <AlertDescription className="!block">
            Chat is disabled until your key status can be checked.
          </AlertDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="shrink-0"
        >
          <RefreshCw data-icon="inline-start" />
          Retry
        </Button>
      </Alert>
    );
  }

  if (hasKey !== false) {
    return null;
  }

  return (
    <Alert
      className="mx-auto !flex w-[96vw] flex-wrap items-center gap-3 px-3 py-2 lg:max-w-[55vw]"
    >
      <KeyRound className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <AlertTitle>API key required</AlertTitle>
        <AlertDescription className="!block">
          Add your Vercel AI Gateway key to start chatting.
        </AlertDescription>
      </div>
      <Button asChild size="sm" variant="outline" className="shrink-0">
        <Link href="/settings">Add key</Link>
      </Button>
    </Alert>
  );
}
