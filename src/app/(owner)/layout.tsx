import { headers } from "next/headers";
import { OwnerLayout } from "@skilldrunk/brain-ui";
import { requireOwner } from "@/lib/owner/auth";
import { SKILLDRUNK_MENU } from "@/lib/owner/menu";

export const dynamic = "force-dynamic";

export default async function OwnerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireOwner();

  // Pathname for sidebar active state (Next.js exposes this via headers in
  // request-scoped helpers; falling back to "/home" if not set).
  const hdrs = await headers();
  const pathname =
    hdrs.get("x-invoke-path") ?? hdrs.get("next-url") ?? "/home";

  const userLabel = user.email?.split("@")[0] ?? "owner";

  return (
    <div className="theme-skilldrunk-corporate">
      <OwnerLayout
        menu={SKILLDRUNK_MENU}
        pathname={pathname}
        breadcrumb={<span>{pathname}</span>}
        userLabel={userLabel}
      >
        {children}
      </OwnerLayout>
    </div>
  );
}
