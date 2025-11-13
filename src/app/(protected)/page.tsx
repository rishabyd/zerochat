import ChatPageHeader from "@/components/chat/chat-page-header";
import MainInputBox from "@/components/chat/InputBox/input-box";
import { getServerUserId } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ChatHomePage() {
  const userId = await getServerUserId();
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="h-screen min-h-0 w-full bg-input/80 justify-center overflow-hidden flex flex-col">
      {/* Mobile Top Bar - Only visible on mobile */}
      <ChatPageHeader />

      <div className="flex-1 min-h-0 flex items-center justify-center">
        <MainInputBox />
      </div>
    </div>
  );
}
