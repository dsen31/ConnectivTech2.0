import { TemplateEditor } from "@/components/templates/TemplateEditor";

export default function NewTemplatePage() {
  return (
    <div className="max-w-6xl">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">New Template</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Write an email template with personalization tokens
        </p>
      </div>
      <TemplateEditor />
    </div>
  );
}
