-- 새봄 DB 스키마 — Supabase SQL Editor에 그대로 붙여넣고 Run
-- (Supabase 대시보드 → SQL Editor → New query → 붙여넣기 → Run)

-- 사용자 프로필 (익명: anon_id 로 구분, 로그인 없음)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  anon_id text unique,               -- 브라우저별 익명 식별자 (없으면 데모용)
  nickname text,
  end_date date,                     -- 보호종료(예정)일
  housing text,
  work text,
  income int,                        -- 월 수입(원)
  expense int,                       -- 월 지출(원)
  settlement int,                    -- 자립정착금 총액(원)
  allowance int,                     -- 자립수당(월, 원)
  balance int,                       -- 현재 잔액(원)
  alloc jsonb,                       -- {emergency, living, saving} (원)
  is_demo boolean default false,     -- 데모용 더미 사용자 표시
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 대화 기록
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  anon_id text,
  created_at timestamptz default now()
);
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text,                         -- 'user' | 'assistant'
  content text,
  created_at timestamptz default now()
);

-- RAG 근거 문서 (pgvector) — 임베딩은 나중에 채움
create extension if not exists vector;
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  source text,                       -- '자립정보북', '금감원 사기유형' 등
  title text,
  category text,                     -- 'support' | 'fraud' | 'general'
  chunk text,                        -- 실제 근거 텍스트
  url text,                          -- 출처 링크
  embedding vector(1024),            -- 임베딩(모델 차원에 맞춰 조정 가능)
  created_at timestamptz default now()
);
