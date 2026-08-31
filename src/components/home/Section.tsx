"use client";

// 섹션 제목 한 벌.
//
// 이전에는 12px 회색이라 존재감이 없었다. 토스처럼 제목을 굵고 진하게 두면
// 화면을 훑을 때 "여기부터 무슨 얘기"인지가 먼저 잡힌다.
export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 px-1">
      <h2 className="text-[17px] font-bold tracking-tight text-ink">{children}</h2>
      {right}
    </div>
  );
}

/** 흰 카드. 테두리 없이 여백과 배경색 차이로만 구분한다. */
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`rounded-[20px] bg-white p-5 ${className}`}>{children}</div>;
}
