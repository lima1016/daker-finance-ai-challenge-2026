import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "새봄 — 자립준비청년 AI 금융 코치",
  description: "물어볼 어른이 없을 때, 먼저 물어보는 금융 멘토. 목돈 관리·지원제도 안내·금융사기 예방을 돕는 AI 코치.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#059669",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
