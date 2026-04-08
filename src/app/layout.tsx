import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SocketProvider } from "@/providers/socket-provider";
import { PermissionProvider } from "@/providers/permission-provider";

import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col selection:bg-primary/30 selection:text-primary-foreground" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <NuqsAdapter>
            <TooltipProvider>
              <SocketProvider>
                <PermissionProvider>
                  {children}
                </PermissionProvider>
              </SocketProvider>
            </TooltipProvider>
          </NuqsAdapter>
          <Toaster
            richColors
            closeButton
            duration={5000}
            position="top-right"
            toastOptions={{
              classNames: {
                closeButton: "!left-auto !right-[-10px]",
              }
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
