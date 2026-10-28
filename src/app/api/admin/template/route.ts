import { requireAdmin } from "@/lib/auth";
import { importTemplateCsv } from "@/lib/csv/export";

export async function GET() {
  try { await requireAdmin(); } catch (e) { return Response.json({ error: (e as Error).message }, { status: 403 }); }
  return new Response(importTemplateCsv(), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="vocabulary_import_template.csv"' } });
}
