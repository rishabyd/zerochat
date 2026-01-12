"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSession } from "@/lib/auth-client";
import { useUserProfileStore } from "@/lib/store/useUserProfileStore";
import { NavSessions } from "./nav-sessions";
import { NavUser } from "./nav-user";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data, isPending } = useSession();
  const isMobile = useIsMobile();

  const fetchProfile = useUserProfileStore((e) => e.fetchProfile);
  const profile = useUserProfileStore((e) => e.profile);
  const userData = {
    name: data?.user?.name || data?.user?.email || "User",
    email: data?.user?.email || "",
    avatar: data?.user?.image || "/avatars/default.jpg",
  };
  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, [profile, fetchProfile]);

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      className={`!border-r-2 shadow-background/50 shadow-md ${
        isMobile
          ? "fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] overflow-x-hidden lg:relative lg:w-auto"
          : ""
      }`}
      {...props}
    >
      <SidebarHeader>
        <SidebarTrigger className="hidden cursor-pointer lg:block" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="mt-2 lg:mt-5">
          <SidebarMenuItem className="flex items-center justify-center">
            <SidebarMenuButton asChild className="p-2">
              <Link href="/">
                <PlusIcon className="h-4 w-4" />
                <span>New chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="mt-8 lg:mt-12">
          <NavSessions />
        </div>
      </SidebarContent>

      <SidebarFooter>
        <NavUser profile={profile} user={userData} isLoading={isPending} />
      </SidebarFooter>
    </Sidebar>
  );
}
