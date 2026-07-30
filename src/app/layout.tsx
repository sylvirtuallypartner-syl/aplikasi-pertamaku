import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Misi Harian - Dashboard Disiplin",
  description: "Dashboard misi harian kemandirian anak, sinkron antar device.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
