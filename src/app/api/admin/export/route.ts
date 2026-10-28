import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { vocabularyToCsv } from "@/lib/csv/export";

export async function GET(req: NextRequest) {
  let sb; try { ({ sb } = await requireAdmin()); } catch (e) { return Response.json({ error: (e as Error).message }, { status: 403 }); }
  const p = req.nextUrl.searchParams;
  const rows: any[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    let q = sb.from("vocabulary_words").select("*, categories(name)").order("normalized_word").order("id").range(from, from + 999);
    if (p.get("level")) q = q.eq("cefr_level", p.get("level")!);
    if (p.get("cat")) q = q.eq("category_id", p.get("cat")!);
    if (p.get("batch")) q = q.eq("import_batch", p.get("batch")!);
    if (p.get("q")) q = q.ilike("search_text", `%${p.get("q")!.toLowerCase().replace(/[%_\\]/g, "\\$&")}%`);
    const { data, error } = await q;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    rows.push(...(data ?? []).map((r: any) => ({ ...r, category: r.categories?.name ?? "" })));
    if (!data || data.length < 1000) break;
  }
  return new Response(vocabularyToCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="vocabulary_export.csv"' } });
}
