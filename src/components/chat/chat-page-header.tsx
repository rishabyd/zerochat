'use client';

export default function ChatPageHeader() {
  return (
    <div className="flex-shrink-0 bg-transparent">
      <div className="flex items-center justify-center px-4 py-3">
        <a
          href="https://github.com/rishabyd/zerochat"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xl font-semibold hover:underline"
        >
          ZeroChat
        </a>
      </div>
    </div>
  );
}
