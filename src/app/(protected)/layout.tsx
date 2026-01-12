import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/sidebar/chat-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getServerUserId } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/services/user-profile";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const userId = await getServerUserId();
  if (!userId) {
    redirect("/sign-in");
  }
  await getCurrentUserProfile(userId);
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <main className="h-screen overflow-hidden">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
