import ChatPageHeader from "@/components/chat/chat-page-header";
import MainInputBox from "@/components/chat/InputBox/input-box";
import { auth } from "@clerk/nextjs/server";

export default async function ChatHomePage() {
  const { userId } = await auth();
  if (!userId) {
    return null;
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
