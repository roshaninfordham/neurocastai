import React from "react";
import type { Metadata } from "next";
import "../../../src/index.css";

export const metadata: Metadata = {
  title: "NeuroCast AI",
  description: "Stroke care coordination control layer"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
