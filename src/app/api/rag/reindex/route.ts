import { NextResponse } from "next/server";
import { supabaseConfigured, getAdmin } from "@/lib/supabaseAdmin";
import { embedText } from "@/lib/rag";

export const runtime = "nodejs";

// 임베딩이 아직 없는 documents 행들을 임베딩해서 채운다. (한 번만 호출하면 됨)
export async function POST() {
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "Supabase 미설정 (.env.local 확인)" }, { status: 503 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY가 필요합니다 (임베딩용)" }, { status: 500 });
  }

  const db = getAdmin();
  const { data: docs, error } = await db.from("documents").select("id, chunk").is("embedding", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!docs || docs.length === 0) {
    return NextResponse.json({ embedded: 0, message: "임베딩할 문서가 없습니다 (이미 모두 색인됨)." });
  }

  let embedded = 0;
  const failures: string[] = [];
  for (const doc of docs) {
    try {
      const embedding = await embedText(doc.chunk as string);
      const { error: upErr } = await db.from("documents").update({ embedding }).eq("id", doc.id);
      if (upErr) failures.push(upErr.message);
      else embedded++;
    } catch (e) {
      failures.push(e instanceof Error ? e.message : String(e));
    }
  }

  return NextResponse.json({ embedded, total: docs.length, failures });
}
