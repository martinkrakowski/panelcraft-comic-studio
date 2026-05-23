import type { Metadata } from "next";
import { WorkspaceProvider } from "../providers/WorkspaceProvider";
import { WorkspaceShell } from "../components/workspace-shell/WorkspaceShell";
import { Toaster } from "@panelcraft/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "PanelCraft Comic Studio",
  description: "AI-powered comic book studio built with LangGraph.js and Adobe Firefly workflows",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WorkspaceProvider>
          <WorkspaceShell>
            {children}
          </WorkspaceShell>
          <Toaster />
        </WorkspaceProvider>
      </body>
    </html>
  );
}
