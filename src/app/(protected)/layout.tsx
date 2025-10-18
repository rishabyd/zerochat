import { AppSidebar } from "@/components/sidebar/chat-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUserProfile } from "@/lib/services/user-profile";
import { auth } from "@clerk/nextjs/server";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    return null;
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
