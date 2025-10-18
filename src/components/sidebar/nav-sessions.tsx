"use client";

import { DeleteSession } from "@/lib/actions/chatSession-action";
import { fetcher } from "@/lib/fetcher";
import { MessageSquareIcon, RefreshCw, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "../ui/button";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "../ui/sidebar";
import { Skeleton } from "../ui/skeleton";

type Session = {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function NavSessions() {
  const { open } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [refreshLoader, setRefreshLoader] = useState(false);
  const {
    data: sessions,
    error,
    isLoading,
    mutate,
  } = useSWR<Session[]>("/api/sessions", fetcher);

  // For refresh button (triggers re-fetch)
  function refreshSessions() {
    setRefreshLoader(true);
    mutate();
    setRefreshLoader(false);
  }

  async function deleteSession(id: string) {
    try {
      await DeleteSession({ sessionId: id });
      mutate();
      if (pathname && pathname !== "/" && pathname.includes(id)) {
        router.push("/");
      }
    } catch (e) {
      // Optionally: handle error, e.g. show toast
    }
  }

  const items = useMemo(() => {
    return (sessions ?? []).map((s) => ({
      id: s.id,
      title: s.title || "Untitled",
      href: `/${s.id}`,
      isActive: pathname?.includes(s.id),
    }));
  }, [sessions, pathname]);
  console.log("items from nav session-", items);

  if (isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Sessions</SidebarGroupLabel>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </SidebarGroup>
    );
  }

  if (error) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Sessions</SidebarGroupLabel>
        <div className="p-2 text-sm text-destructive">
          <p>{error.message}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshSessions}
            className="mt-2"
          >
            <RefreshCw className={`h-4 w-4`} />
            Retry
          </Button>
        </div>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center h-12 justify-between">
        <span>Sessions</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshSessions}
          className="h-6 w-6 p-0 cursor-pointer hover:bg-accent"
        >
          {
            <RefreshCw
              className={`${refreshLoader && "animate-spin"} h-3 w-3`}
            />
          }
        </Button>
      </SidebarGroupLabel>

      <SidebarMenu>
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-2 text-sm text-muted-foreground"
            >
              {open ? "No sessions yet" : ""}
            </motion.span>
          ) : (
            items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={item.isActive}>
                    <Link href={item.href}>
                      <MessageSquareIcon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuAction
                    onClick={() => deleteSession(item.id)}
                    className="h-4 w-4 cursor-pointer text-destructive hover:text-destructive"
                  >
                    <Trash2 className="hover:text-red-700 text-white duration-300 h-4 w-4" />
                  </SidebarMenuAction>
                </SidebarMenuItem>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </SidebarMenu>
    </SidebarGroup>
  );
}
