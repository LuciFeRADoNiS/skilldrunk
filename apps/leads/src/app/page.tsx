import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { user, role } = await getSessionRole();

  if (user && role === "admin") redirect("/admin");
  if (user && role === "staff") redirect("/me");
  if (user && role === "none") redirect("/unauthorized");

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">
            skilldrunk
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Lead Portal</h1>
          <p className="mt-2 text-sm text-neutral-400">
            ENCO satış ekibi giriş paneli.
          </p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-neutral-600">
          Erişim talebi için Özgür&apos;e yazın.
        </p>
      </div>
    </main>
  );
}
