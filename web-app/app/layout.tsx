import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SATPS — Smart Academic Tracking and Prediction System",
  description:
    "Academic risk monitoring and predictive analytics for students, teachers, and faculty administrators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
