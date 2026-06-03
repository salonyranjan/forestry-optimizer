import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Professional Metadata to instantly capture recruiter attention
export const metadata: Metadata = {
  title: "EcoCompute | Urban Heat Island & Forestry Optimizer",
  description: "An advanced agentic RAG and 3D geospatial optimization platform mapping urban thermal mitigation strategies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      {/* Set the background directly to bg-gray-950 to ensure a seamless dark mode load */}
      <body className="min-h-full h-full w-full bg-gray-950 text-gray-100 flex flex-col overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}