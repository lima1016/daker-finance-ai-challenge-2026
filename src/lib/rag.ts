// RAG — Gemini 무료 임베딩(text-embedding-004, 768차원) + Supabase pgvector 검색
import { GoogleGenAI } from "@google/genai";
import { getAdmin, supabaseConfigured } from "./supabaseAdmin";

const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
const EMBED_DIM = 768; // documents.embedding vector(768) 와 일치

export function ragConfigured(): boolean {
  return supabaseConfigured() && !!process.env.GEMINI_API_KEY;
}

/** 텍스트 하나를 임베딩 벡터로 변환 (768차원) */
export async function embedText(text: string): Promise<number[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const res = await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: text,
    config: { outputDimensionality: EMBED_DIM },
  });
  const values = res.embeddings?.[0]?.values;
  if (!values || values.length === 0) throw new Error("임베딩 생성 실패");
  return values;
}

export interface DocHit {
  id: string;
  source: string;
  title: string;
  category: string;
  chunk: string;
  url: string;
  similarity: number;
}

/** 질문과 가장 가까운 근거 문서를 pgvector로 검색 */
export async function searchDocuments(
  query: string,
  opts?: { matchCount?: number; category?: string | null },
): Promise<DocHit[]> {
  const embedding = await embedText(query);
  const db = getAdmin();
  const { data, error } = await db.rpc("match_documents", {
    query_embedding: embedding,
    match_count: opts?.matchCount ?? 4,
    filter_category: opts?.category ?? null,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as DocHit[];
}
