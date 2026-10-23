# ERD와 상점 UI 대조

## 확인된 ERD
- THEME: id, name, price. 별도 PRODUCT 테이블 없음.
- USERS: id, login_id, password, nickname, coin, trophy.
- THEME_ORDER_HISTORY: id, user_id, theme_id, ordered_at.
- ID 타입, null 허용 여부, 금액 타입, FK 제약의 구체적인 정의는 이미지에서 확인되지 않음.

## 이번 UI 수정
- 상품 모델을 ShopTheme(themeId, name, price)로 명확히 하고 예시 응답도 이 형태로 변경.
- themeId는 THEME.id를 UI 경계에서 표현하는 이름. 문자열 예시 ID는 DB 타입을 확정한 것이 아님.
- ERD에 없는 설명·색상·glow는 프론트의 ThemePresentation으로 분리. 미등록 테마는 기본 미리보기임을 설명.
- 금액 단위를 USERS.coin에 맞춰 코인으로 표시.
- 실제 로그인·구매·잔액·테마 적용은 추가하지 않음. 게임 로직과 저장 코드는 변경하지 않음.
- DB 명칭과 API 경로는 별개. 기존 /products 명세를 이 작업에서 자동 폐기하지 않으며 DTO를 themeId로 정할지는 백엔드와 동기화 필요.

## 백엔드 팀에 제안할 개선 (DB 변경 아님)
1. 테마 적용을 저장하려면 USERS.selected_theme_id FK 또는 사용자 테마 선택 테이블 필요. 선택값이 보유/기본 테마인지 서버 검증.
2. 중복 구매 금지 정책이면 THEME_ORDER_HISTORY에 UNIQUE(user_id, theme_id). 구매 기록을 보유 권한으로 사용할 경우 기본 지급 테마 처리 정책도 필요.
3. THEME_ORDER_HISTORY.paid_coin 등 실제 결제 금액 저장 권장. 현재 THEME.price만으로는 가격 변경 후 과거 구매 금액 복원 불가.
4. 구매 요청 재시도를 위한 사용자별 요청 키와 정산 결과 저장 전략 필요. 잔액 차감·보유 등록은 일관된 처리와 동시성 제어 필요.
5. 색상 정보를 서버 관리하려면 THEME.theme_key 등 안정적인 스타일 식별자 추가 권장. description, preview_image_url은 화면 정책에 따라 선택. 현재 UI 로컬 매핑은 샘플 ID에만 대응.
6. THEME.price와 USERS.coin은 정수/0 이상 제약 권장. USERS.password는 평문이 아닌 비밀번호 해시 저장.
7. MY_BLOCK에는 사용자 연결선이 있지만 user_id FK가 필드 목록에 없음. 추가 확인 및 UNIQUE(user_id, block_id) 등 중복 정책 검토.
8. COORDINATE는 block_id FK를 가지므로 한 BLOCK에 여러 좌표 행 관계. 이미지의 N:1 표기 위치 확인 및 UNIQUE(block_id, x, y) 검토.
9. 게임별 결과/보상 정산·재화 원장은 현재 그림에 없음. 게임 재화 지급과 공식 랭킹을 구현하려면 별도 설계 필요.
10. MATCH_PARTICIPANT는 UNIQUE(room_id, user_id)와 참가/준비/경기 상태에 필요한 데이터 검토.

## 범위와 제한
ERD는 UI 표시의 기반과 대체로 맞지만 로그인·보유 판정·구매·선택 영속화까지 완성하는 스키마는 아님. 이미지에 없는 컬럼이나 정책을 구현된 것으로 가정하지 않음.
