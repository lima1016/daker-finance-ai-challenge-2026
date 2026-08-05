import { NextResponse } from "next/server";
import { supabaseConfigured, getAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// 데모용: DB에 저장된 (가상) 사용자 목록을 반환
export async function GET() {
  if (!supabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase 미설정 — .env.local에 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 를 넣고 서버를 재시작하세요." },
      { status: 503 },
    );
  }

  const db = getAdmin();
  const { data, error } = await db
    .from("profiles")
    .select("id, anon_id, nickname, end_date, housing, work, income, expense, settlement, allowance, balance, alloc, is_demo")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profiles: data });
}
