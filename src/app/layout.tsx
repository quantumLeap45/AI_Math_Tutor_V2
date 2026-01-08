import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AI Math Tutor | Singapore Primary 1-6 Mathematics',
  description:
    'AI-powered math tutoring for Singapore Primary 1-6 students. Learn with SHOW mode for solutions or TEACH mode for guided learning.',
  keywords: [
    'math tutor',
    'Singapore',
    'primary school',
    'mathematics',
    'AI tutor',
    'MOE syllabus',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-screen`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
