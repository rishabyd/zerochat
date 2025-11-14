"use client";

import { DeleteSession } from "@/lib/actions/chatSession-action";
import { fetcher } from "@/lib/fetcher";
import { MessageSquareIcon, RefreshCw, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { toast } from "sonner";
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

type SessionItem = {
  id: string;
  title: string;
  href: string;
  isActive: boolean;
};

export function NavSessions() {
  const { open } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const {
    data: sessions,
    error,
    isLoading,
    mutate,
  } = useSWR<Session[]>("/api/sessions", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const items = useMemo<SessionItem[]>(() => {
    return (sessions ?? []).map((s) => ({
      id: s.id,
      title: s.title || "Untitled",
      href: `c/${s.id}`,
      isActive: pathname?.includes(s.id) ?? false,
    }));
  }, [sessions, pathname]);

  const handleRefresh = () => {
    startTransition(() => {
      mutate();
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await DeleteSession({ sessionId: id });

      // Optimistic update
      mutate((current) => current?.filter((s) => s.id !== id), {
        revalidate: false,
      });

      // Redirect if deleting current session
      if (pathname?.includes(id)) {
        router.push("/");
      }

      toast.success("Session deleted");
    } catch (error) {
      toast.error("Failed to delete session");
      mutate(); // Revalidate on error
    }
  };

  if (isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Sessions</SidebarGroupLabel>
        <div className="space-y-2 p-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none" />
          ))}
        </div>
      </SidebarGroup>
    );
  }

  if (error) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Sessions</SidebarGroupLabel>
        <div className="p-4 space-y-2">
          <p className="text-sm text-destructive">Failed to load sessions</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
            className="w-full"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isPending && "animate-spin"}`}
            />
            Retry
          </Button>
        </div>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between h-12 px-2">
        <span>Sessions</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isPending}
          className="h-7 w-7"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isPending && "animate-spin"}`} />
          <span className="sr-only">Refresh sessions</span>
        </Button>
      </SidebarGroupLabel>

      <SidebarMenu>
        <AnimatePresence mode="popLayout">
          {items.length === 0
            ? open && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="px-4 py-8 text-center"
                >
                  <p className="text-sm text-muted-foreground">
                    No sessions yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start a new chat to create one
                  </p>
                </motion.div>
              )
            : items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.02,
                  }}
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={item.isActive}
                      className="rounded-none group"
                    >
                      <Link href={item.href}>
                        <MessageSquareIcon className="h-4 w-4" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>

                    <SidebarMenuAction
                      onClick={() => handleDelete(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                      <span className="sr-only">Delete session</span>
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                </motion.div>
              ))}
        </AnimatePresence>
      </SidebarMenu>
    </SidebarGroup>
  );
}
