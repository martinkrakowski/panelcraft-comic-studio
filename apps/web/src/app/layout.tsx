import type { Metadata } from 'next';
import { WorkspaceProvider } from '../providers/WorkspaceProvider';
import { WorkspaceShell } from '../components/workspace-shell/WorkspaceShell';
import { MobileSidebarProvider, Toaster } from '@panelcraft/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'PanelCraft Comic Studio',
  description:
    'AI-powered comic book studio built with LangGraph.js and Adobe Firefly workflows',
};

/**
 * Root application HTML/body layout shell component.
 * Wraps route content with workspace providers, navigation header chrome, and global toast notifications.
 *
 * The `MobileSidebarProvider` sits inside `WorkspaceProvider` so the
 * shell header (trigger button), drawer, and every `AppCanvasTwoPane`
 * downstream all share the same open/slot state.
 *
 * @component
 * @param props - Component properties.
 * @param props.children - Route segment React nodes to render inside layout body.
 * @returns React.Element root HTML structure.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WorkspaceProvider>
          <MobileSidebarProvider>
            <WorkspaceShell>{children}</WorkspaceShell>
          </MobileSidebarProvider>
          <Toaster />
        </WorkspaceProvider>
      </body>
    </html>
  );
}
