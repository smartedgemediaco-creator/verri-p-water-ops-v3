import type { Metadata } from "next";
import { Outfit } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProviderWrapper } from "./auth-wrapper";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Verri P Water Inc",
  description: "Sachet & Bottle Water Production — Factory, Depot & Distribution Management System",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <SidebarProvider>
            <AuthProviderWrapper>{children}</AuthProviderWrapper>
          </SidebarProvider>
        </ThemeProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: '14px' } }} />
      </body>
    </html>
  );
}
