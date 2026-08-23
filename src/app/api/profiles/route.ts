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
    // 시드 데이터는 한 INSERT문으로 들어가 created_at이 완전히 같다.
    // 그것만으로 정렬하면 순서가 매번 달라져, 앱이 쓰는 profiles[0]이 들쭉날쭉해진다.
    .order("created_at", { ascending: true })
    .order("anon_id", { ascending: true });

  if (error) {
    console.error("[profiles]", error.message);

    // "fetch failed"는 대개 프로젝트가 사라졌거나(무료 티어 만료) 네트워크가 막힌 경우다.
    // 원본 메시지를 그대로 내보내면 사용자는 무슨 일인지 알 수 없다.
    const unreachable = /fetch failed|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|getaddrinfo/i.test(
      error.message,
    );
    if (unreachable) {
      const host = (() => {
        try {
          return new URL(process.env.SUPABASE_URL!).host;
        } catch {
          return process.env.SUPABASE_URL ?? "(설정 없음)";
        }
      })();
      return NextResponse.json(
        {
          error: `Supabase 서버(${host})에 연결하지 못했어요. 프로젝트가 삭제·중지되었거나 주소가 잘못됐을 수 있어요. DB 없이도 내 정보를 직접 입력하거나 '샘플 데이터' 버튼으로 그대로 둘러볼 수 있어요.`,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: `DB에서 불러오지 못했어요. (${error.message})` },
      { status: 500 },
    );
  }
  return NextResponse.json({ profiles: data });
}
