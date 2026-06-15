import { notFound } from "next/navigation";
import { getTemplate } from "@/app/actions/templates";
import { TemplateEditor } from "@/components/templates/TemplateEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: PageProps) {
  const { id } = await params;
  const template = await getTemplate(id).catch(() => null);
  if (!template) notFound();

  return (
    <div className="max-w-6xl">
      <TemplateEditor template={template} />
    </div>
  );
}
