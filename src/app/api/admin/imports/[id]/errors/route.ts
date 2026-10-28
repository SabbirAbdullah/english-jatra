import { requireAdmin } from "@/lib/auth";
import { errorReportToCsv } from "@/lib/csv/export";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  let sb; try { ({ sb } = await requireAdmin()); } catch (e) { return Response.json({ error: (e as Error).message }, { status: 403 }); }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
  const { data, error } = await sb.from("import_errors").select("row_number,column_name,severity,code,message").eq("job_id", id).order("row_number").limit(5000);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const issues = (data ?? []).map((r) => ({ row: r.row_number, column: r.column_name ?? "", severity: r.severity, code: r.code, message: r.message }));
  return new Response(errorReportToCsv(issues as any), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="import_${id.slice(0, 8)}_issues.csv"` } });
}
