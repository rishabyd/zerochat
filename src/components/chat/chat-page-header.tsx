"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

export default function ChatPageHeader() {
  return (
    <div className="flex-shrink-0 border-border border-b bg-sidebar md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="rounded-none p-2 transition-colors hover:bg-accent" />
        </div>
      </div>
    </div>
  );
}
