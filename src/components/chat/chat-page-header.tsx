"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

export default function ChatPageHeader() {
  return (
    <div className="flex-shrink-0 bg-sidebar border-b border-border md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="p-2 hover:bg-accent rounded-lg transition-colors" />
        </div>
      </div>
    </div>
  );
}
