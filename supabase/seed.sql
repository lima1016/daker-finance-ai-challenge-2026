-- 새봄 더미 데이터 — schema.sql 실행 후, SQL Editor에 붙여넣고 Run
-- 데모용 가상 사용자 2명 + RAG 예시 문서 3건

-- 가상 사용자 (금액 단위: 원)
insert into profiles (anon_id, nickname, end_date, housing, work, income, expense, settlement, allowance, balance, alloc, is_demo)
values
  ('demo-saebom', '김새봄', current_date + interval '34 days', '원룸 월세', '구직 중',
   1200000, 900000, 15000000, 500000, 13000000,
   '{"emergency":4500000,"living":6000000,"saving":4500000}', true),
  ('demo-haneul', '하늘', current_date - interval '120 days', 'LH임대', '재직 중',
   1800000, 1300000, 10000000, 500000, 7200000,
   '{"emergency":3000000,"living":4000000,"saving":3000000}', true)
on conflict (anon_id) do nothing;

-- RAG 예시 문서 (임베딩은 나중에 스크립트로 채움)
insert into documents (source, title, category, chunk, url)
values
  ('아동권리보장원 자립정보북', '자립수당', 'support',
   '자립수당은 보호종료 후 5년간 매월 지급되는 현금성 지원으로, 주소지 관할 지자체(자립지원전담기관)를 통해 신청한다.',
   'https://www.ncrc.or.kr'),
  ('금융감독원', '통장 대여의 위험', 'fraud',
   '타인에게 통장(계좌)을 빌려주면 대포통장으로 악용되어 전자금융거래법 위반으로 형사처벌 및 금융거래 제한을 받을 수 있다. 어떤 이유로도 통장을 빌려주면 안 된다.',
   'https://www.fss.or.kr'),
  ('서민금융진흥원', '햇살론유스', 'support',
   '햇살론유스는 대학생·미취업청년 등 청년층을 위한 저금리 정책서민금융 상품으로, 서민금융진흥원 및 협약 은행을 통해 이용할 수 있다.',
   'https://www.kinfa.or.kr')
on conflict do nothing;
