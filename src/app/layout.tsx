import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CMN - Money Couple",
  description: "Personal and couple finance manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
