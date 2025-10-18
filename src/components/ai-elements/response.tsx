"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "prose prose-base dark:prose-invert max-w-none",
        // Paragraphs
        "prose-p:leading-7 prose-p:my-3",
        // Headings spacing similar to ChatGPT
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-h1:text-2xl prose-h1:mt-6 prose-h1:mb-3",
        "prose-h2:text-xl prose-h2:mt-5 prose-h2:mb-3",
        "prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2",
        // Lists
        "prose-ul:my-3 prose-ol:my-3 prose-li:my-1",
        // Blockquote
        "prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-3 prose-blockquote:my-3",
        // Code (inline and blocks)
        "prose-code:bg-card/80 prose-code:text-card-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[0.9em] prose-code:font-mono",
        "prose-pre:bg-card prose-pre:text-card-foreground prose-pre:border prose-pre:border-border prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:my-4",
        // Tables
        "prose-table:my-0 prose-table:w-full prose-table:table-fixed",
        // Force solid table layout and borders
        "[&_table]:border [&_table]:border-border [&_table]:rounded-lg [&_table]:border-collapse",
        // Table cell alignment and wrapping
        "prose-th:text-left prose-th:align-top prose-td:align-top",
        "prose-th:break-words prose-td:break-words",
        "prose-thead:bg-card",
        "prose-th:bg-card prose-th:text-primary prose-th:font-semibold prose-th:border-b prose-th:border-border prose-th:p-3",
        "prose-tr:border-b prose-tr:border-border",
        "prose-td:bg-card prose-td:text-foreground prose-td:p-3 prose-td:border-b prose-td:border-border",
        // Emphasis
        "prose-strong:font-semibold prose-em:italic",
        // Divider
        "prose-hr:border-border prose-hr:my-6",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
