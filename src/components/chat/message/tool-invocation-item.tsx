"use client";

import type { ToolUIPart } from "ai";
import { memo, useMemo } from "react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { cn } from "@/lib/utils";

export const getToolDisplayName = (part: ToolUIPart) => {
  return (part as { toolName?: string }).toolName ?? part.type.replace(/^tool-/, "");
};

const renderStructuredValue = (value: unknown) => {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    return (
      <pre className="max-h-60 overflow-y-auto overscroll-contain whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 font-mono text-xs">
        {value}
      </pre>
    );
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <span className="rounded-md bg-muted/50 px-2 py-1 font-mono text-xs">{String(value)}</span>
    );
  }

  try {
    return (
      <pre className="max-h-60 overflow-y-auto overscroll-contain whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 font-mono text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  } catch (_error) {
    return <span className="text-muted-foreground text-sm">{String(value)}</span>;
  }
};

type ToolInvocationItemProps = {
  part: ToolUIPart;
};

const ToolInvocationItem = memo(({ part }: ToolInvocationItemProps) => {
  const displayName = useMemo(() => getToolDisplayName(part), [part]);
  const outputNode = useMemo(() => renderStructuredValue(part.output), [part.output]);
  const shouldShowInput = part.input !== undefined && part.input !== null;
  const hasResult = Boolean(part.errorText) || Boolean(part.output);

  return (
    <Tool
      defaultOpen={
        part.state === "input-streaming" ||
        part.state === "input-available" ||
        part.state === "output-error"
      }
      className="bg-background/60"
    >
      <ToolHeader state={part.state} type={part.type} label={displayName} />
      <ToolContent className={cn("border-border/60 border-t")}>
        {shouldShowInput && <ToolInput input={part.input} />}
        {hasResult ? (
          <ToolOutput errorText={part.errorText} output={outputNode} />
        ) : (
          <div className="px-4 pb-4 text-muted-foreground text-xs">
            Waiting for the tool response...
          </div>
        )}
      </ToolContent>
    </Tool>
  );
});

ToolInvocationItem.displayName = "ToolInvocationItem";

export default ToolInvocationItem;
