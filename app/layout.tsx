import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../src/index.css';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { ToastProvider } from '@/src/components/ToastProvider';
import { ResearchEngineProvider } from '@/src/contexts/ResearchEngineContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RebarHQ - B2B Intelligence Platform',
  description: 'AI-powered company research and prospect intelligence for sales teams',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <AuthProvider>
            <ResearchEngineProvider>
              {children}
            </ResearchEngineProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
