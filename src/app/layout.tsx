import { Toaster } from '@/components/ui/sonner';
import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ZeroChat',
  description: 'Privacy-first agentic chat to talk to top frontier models',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={jetbrainsMono.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            richColors
            toastOptions={{
              className: 'rounded-none',
              style: { borderRadius: 0 },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
