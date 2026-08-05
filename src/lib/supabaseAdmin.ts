// 서버 전용 Supabase 클라이언트 (service_role 키 — 절대 클라이언트로 노출 금지)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function supabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let cached: SupabaseClient | null = null;

export function getAdmin(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  return cached;
}
