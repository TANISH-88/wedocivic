import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import { Toaster } from "react-hot-toast";
import AuthProvider from "@/components/providers/AuthProvider";
import ChatBot from "@/components/chat/ChatBot";
import InstallPWA from "@/components/providers/InstallPWA";
import "./globals.css";

const jakarta  = Plus_Jakarta_Sans({ variable: "--font-sans",    subsets: ["latin"], weight: ["400","500","600","700","800"] });
const playfair = Playfair_Display({ variable: "--font-display", subsets: ["latin"], weight: ["400","600","700"] });

export const metadata: Metadata = {
  title: { default: "CivicImpact", template: "%s | CivicImpact" },
  description: "Social platform for citizens, NGOs, and volunteers.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/favicon.ico",
    shortcut: "/icons/favicon-96x96.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CivicImpact",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#2C3E50",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Camera permissions for Website 2 APK Builder */}
        <meta name="camera" content="yes" />
        <meta name="camera-permission" content="rear" />
        <meta name="permissions" content="camera" />
      
      </head>
      <body className={`${jakarta.variable} ${playfair.variable} antialiased`}>
        <AuthProvider>
          {children}
          <ChatBot />
          <InstallPWA />
        </AuthProvider>
        
        <Toaster position="top-center" toastOptions={{
          style: { fontFamily: "var(--font-sans)", borderRadius: "12px", fontSize: "14px" },
          success: { iconTheme: { primary: "#16a34a", secondary: "#fff" } },
        }} />
      </body>
    </html>
  );
}
