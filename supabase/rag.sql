-- 새봄 RAG 설정 — Supabase SQL Editor에 붙여넣고 Run (한 번만)
-- Gemini text-embedding-004 = 768차원에 맞춰 embedding 컬럼을 재설정하고,
-- 코사인 유사도로 근거 문서를 찾는 match_documents 함수를 만든다.

create extension if not exists vector;

-- 기존 embedding 컬럼(비어있음)을 768차원으로 교체
alter table documents drop column if exists embedding;
alter table documents add column embedding vector(768);

-- 질문 임베딩과 가장 가까운 문서 검색 (유사도 높은 순)
create or replace function match_documents(
  query_embedding vector(768),
  match_count int default 4,
  filter_category text default null
)
returns table (
  id uuid,
  source text,
  title text,
  category text,
  chunk text,
  url text,
  similarity float
)
language sql stable
as $$
  select
    d.id, d.source, d.title, d.category, d.chunk, d.url,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  where d.embedding is not null
    and (filter_category is null or d.category = filter_category)
  order by d.embedding <=> query_embedding
  limit match_count;
$$;
