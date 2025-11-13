"use client";

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
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
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
      className={`!border-r-2  shadow-md shadow-background/50 ${
        isMobile
          ? "fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] lg:relative lg:w-auto  overflow-x-hidden"
          : ""
      }`}
      {...props}
    >
      <SidebarHeader>
        <SidebarTrigger className="hidden lg:block cursor-pointer" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="lg:mt-5 mt-2">
          <SidebarMenuItem className="flex justify-center items-center">
            <SidebarMenuButton asChild>
              <Link href="/">
                <PlusIcon className="h-4 w-4" />
                <span>New chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="lg:mt-12 mt-8">
          <NavSessions />
        </div>
      </SidebarContent>

      <SidebarFooter>
        <NavUser profile={profile} user={userData} isLoading={isPending} />
      </SidebarFooter>
    </Sidebar>
  );
}
