# FIT ID Partner — PoC 상품 등록·사진·사이즈표

배포: https://fit-id-partner2.vercel.app/

## 상품 등록 화면 사용법

1. **Partner 계정**으로 로그인 → **상품 관리**.
2. 기존 쇼핑몰 상품이 많다면 **CSV 일괄 등록**을 사용합니다. 엑셀은 CSV로 저장하세요. 상품명·코드 등과 사이즈 실측정보가 입력되며, 실측표가 없는 상품은 `DRAFT`로 등록됩니다.
3. **사이즈표를 캡처한 경우**, 상품 정보의 대분류·세부 카테고리를 고른 다음 **사이즈 실측 → 사이즈표 캡처로 자동 입력**에서 JPG/PNG/WebP를 선택하고 분석 동의 후 추출합니다. 결과를 실제 표와 대조하고 **아래 사이즈 입력칸에 반영**을 누른 후, 필요한 빈 항목을 보완하고 **상품 FIT DATA 등록**으로 저장합니다.
4. **상품 대표사진**은 상품 정보의 **상품 대표사진 (가상피팅용)**에서 선택해 상품 저장 시 함께 업로드합니다. 이미 등록한 상품은 **등록 상품 카드 → 상품 사진 등록/교체 → 선택한 사진 저장**을 사용합니다.
5. 등록된 대표사진은 Supabase Storage 공개 버킷 `product-images`에 보관되고 `public.products.image_path`에 연결됩니다. Consumer FIT CHECK / 제휴상품 가상피팅에서 동일 이미지를 참조합니다.

## 필수 사항

- 사이즈표 OCR은 **AI가 읽은 값을 자동 저장하지 않습니다**. 판매자가 단위(cm), **단면/둘레**, 행·열/사이즈를 직접 확인해야 합니다.
- 사이즈표가 인치, 신체 권장 사이즈 또는 불명확한 둘레 표인 경우 안전을 위해 자동 입력을 생략합니다.
- OCR 이미지는 OpenAI API에서 처리되며 FIT ID 자체 DB/Storage에 저장하지 않습니다. 분석 동의를 선택해야 실행됩니다.
- 5MB 이하 JPEG/PNG/WebP를 지원합니다. 상품 대표사진은 공개 이미지가 됩니다. 정면 단독 상품 사진을 권장합니다.
- 업로드에는 파트너 로그인과 자기 쇼핑몰 상품 소유권이 필요하며, Storage 키는 `<authUID>/<shopID>/<productID>/<uuid>.<ext>` 형식으로 격리합니다.
- 이미지 업로드에 실패해도 **상품 실측 저장 결과와 사진 업로드 결과를 구분해 표시**하며, DB 연결 실패 시 새로 생성된 Storage 이미지 삭제를 시도합니다.
- `DRAFT` 상품은 실측 추가·검증 완료 전에는 SDK 설치 및 FIT CHECK 링크 사용 대상에서 제외됩니다.
- AI 사이즈표 인식 서버에는 파트너별 24시간 12회 제한을 적용했습니다. 실물 고객 계정으로 최종 OCR API 응답과 브라우저 이미지를 확인하는 단계는 별도 QA입니다.

## 기술 구성

- GitHub: `kyumin-5/fit-id-partner`
- Supabase 프로젝트: `llgluktnejdbnqhlprvz`
- 사이즈표 분석: Edge Function `partner-size-chart-read-v1` (유효한 파트너 JWT 필요, 이미지 송신 동의 필요, 소유권/쿼터 확인)
- 사진 저장: `product-images` 공개 버킷 + `public.products.image_path`, 기존 파트너 RLS 적용
- 기존 FIT CHECK·correction scope 로직 미수정

## 자동 검증

GitHub Actions Partner CI: CSV parser smoke, product image validation/storage rollback smoke, `tsc --noEmit`, Next.js build.
