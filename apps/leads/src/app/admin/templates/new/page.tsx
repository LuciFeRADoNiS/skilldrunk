import { requireAdmin } from "@/lib/auth";
import { createTemplate } from "../actions";
import { TemplateForm } from "../template-form";

export const dynamic = "force-dynamic";

export default async function NewTemplatePage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Yeni Template</h1>
      </div>
      <TemplateForm initial={{ active: true }} action={createTemplate} submitLabel="Oluştur" />
    </div>
  );
}
