import ChatPageHeader from "@/components/chat/chat-page-header";
import MainInputBox from "@/components/chat/InputBox/input-box";

export default async function ChatHomePage() {
  return (
    <div className="flex h-screen min-h-0 w-full flex-col justify-center overflow-hidden bg-input/80">
      {/* Mobile Top Bar - Only visible on mobile */}
      <ChatPageHeader />

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <MainInputBox />
      </div>
    </div>
  );
}
