-- 새봄 DB 초기화 (기존 테이블을 지우고 새로 만듦 + 더미 데이터)
-- Supabase → SQL Editor → New query → 이 파일 전체 붙여넣고 Run
-- ⚠️ 기존 profiles/documents 등 테이블을 삭제합니다. 새 프로젝트라 안전해요.

drop table if exists messages cascade;
drop table if exists conversations cascade;
drop table if exists documents cascade;
drop table if exists profiles cascade;

-- 사용자 프로필 (익명: anon_id 로 구분)
create table profiles (
  id uuid primary key default gen_random_uuid(),
  anon_id text unique,
  nickname text,
  end_date date,
  housing text,
  work text,
  income int,
  expense int,
  settlement int,
  allowance int,
  balance int,
  alloc jsonb,
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 대화 기록
create table conversations (
  id uuid primary key default gen_random_uuid(),
  anon_id text,
  created_at timestamptz default now()
);
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text,
  content text,
  created_at timestamptz default now()
);

-- RAG 근거 문서 (pgvector)
create extension if not exists vector;
create table documents (
  id uuid primary key default gen_random_uuid(),
  source text,
  title text,
  category text,
  chunk text,
  url text,
  embedding vector(1024),
  created_at timestamptz default now()
);

-- ── 더미 데이터 ──────────────────────────────────────
insert into profiles (anon_id, nickname, end_date, housing, work, income, expense, settlement, allowance, balance, alloc, is_demo)
values
  ('demo-june', '김새봄', current_date + interval '34 days', '원룸 월세', '구직 중',
   1200000, 900000, 15000000, 500000, 13000000,
   '{"emergency":4500000,"living":6000000,"saving":4500000}', true),
  ('demo-haneul', '하늘', current_date - interval '120 days', 'LH임대', '재직 중',
   1800000, 1300000, 10000000, 500000, 7200000,
   '{"emergency":3000000,"living":4000000,"saving":3000000}', true);

insert into documents (source, title, category, chunk, url)
values
  ('아동권리보장원 자립정보북', '자립수당', 'support',
   '자립수당은 보호종료 후 5년간 매월 지급되는 현금성 지원으로, 주소지 관할 지자체(자립지원전담기관)를 통해 신청한다.',
   'https://www.ncrc.or.kr'),
  ('금융감독원', '통장 대여의 위험', 'fraud',
   '타인에게 통장(계좌)을 빌려주면 대포통장으로 악용되어 전자금융거래법 위반으로 형사처벌 및 금융거래 제한을 받을 수 있다.',
   'https://www.fss.or.kr'),
  ('서민금융진흥원', '햇살론유스', 'support',
   '햇살론유스는 대학생·미취업청년 등 청년층을 위한 저금리 정책서민금융 상품이다.',
   'https://www.kinfa.or.kr');
