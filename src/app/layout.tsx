import type { Metadata } from "next";
import { Toaster } from 'react-hot-toast';
import '@fontsource/outfit/100.css';
import '@fontsource/outfit/200.css';
import '@fontsource/outfit/300.css';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import '@fontsource/outfit/900.css';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProviderWrapper } from "./auth-wrapper";

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
      <body className="dark:bg-gray-900">
        <ThemeProvider>
          <SidebarProvider>
            <AuthProviderWrapper>{children}</AuthProviderWrapper>
          </SidebarProvider>
        </ThemeProvider>
        <Toaster position="top-right" containerStyle={{ zIndex: 99999 }} toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
}
