import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '독서 논술 학습 도우미',
  description: '아동 독서 논술 교육을 위한 AI 도우미',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
