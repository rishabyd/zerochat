"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { memo } from "react";
import { Streamdown } from "streamdown";

export type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(function Response({
  className,
  ...props
}: ResponseProps) {
  return (
    <Streamdown
      // Keep Streamdown doing its thing with unterminated markdown
      parseIncompleteMarkdown
      className={cn(
        // Clean default typography, similar to Vercel examples
        "prose prose-sm dark:prose-invert max-w-none",
        className,
      )}
      {...props}
    />
  );
});
