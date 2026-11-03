import type { ReactNode } from "react";
import { AppHeader } from "@/components/ui/app-header";
import { requireSession } from "@/server/auth/session";
import { loadAppHeaderView } from "@/server/views/app-header-view";

type WorkspaceLayoutProps = {
  children: ReactNode;
};

// Every signed-in screen: the top nav, then the page. Pages still call requireSession()
// themselves, because a layout isn't re-run on every navigation.
export default async function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const biller = await requireSession();
  const header = await loadAppHeaderView(biller);
  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader
        billerName={header.billerName}
        billerInitials={header.billerInitials}
        openDenialCount={header.openDenialCount}
      />
      {children}
    </div>
  );
}
