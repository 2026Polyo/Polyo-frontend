# Polyo-frontend
Polyo 프로젝트의 프론트엔드

React + TypeScript + Vite 기반이며, `npm run dev`로 실행합니다. `npm test`로 테스트하고 `npm run build`로 타입 검사와 배포 빌드를 수행합니다.

## 멀티

시작 화면의 **멀티**를 누르면 방 목록이 열립니다. 상단의 **코드로 접속**, **방 만들기**에서 코드 입장이나 방 생성을 할 수 있습니다. 공개 방은 목록에서 바로 입장하며 비공개 방은 코드로 접속합니다. 목록은 20개씩 조회하고 새로고침·이전/다음 페이지를 지원합니다.

- 목록: `GET /api/match-room?page=0&size=20`
- ID 입장: `POST /api/match-room/{roomId}/members`, 본문 없음
- 코드 입장: `POST /api/match-room/code/members`, JSON `{ entryCode }`. 앞뒤 공백 제거·대문자 변환 후 8자리 검사
- 생성: `POST /api/match-room`, JSON `{ roomName, isPrivate }`. 이름은 1~30자, 정원은 방장 포함 2명으로 고정되며 입력 항목에서 제외
- 생성·입장 성공 시 서버 발급 입장 코드를 표시하고 복사할 수 있습니다.
- 개발 연결: `.env.example`을 `.env.local`로 복사하고 `API_PROXY_TARGET`을 실행 중인 백엔드 주소로 설정한 후 Vite를 다시 시작합니다.
- 배포 연결: 기본은 동일 출처 `/api`입니다. 별도 API 서버를 사용하면 `VITE_API_BASE_URL`에 서버 출처를 설정해 빌드합니다. 서버는 해당 프론트 출처의 인증 쿠키와 credential CORS 요청을 허용해야 합니다.
- 인증: 현재 세션 쿠키를 `credentials: include`로 전달합니다. 로그인 화면과 JWT 발급·저장은 아직 구현되지 않았으며, 인증 방식 확정 시 API 연결 계층에서 반영해야 합니다.

삭제·대기실·WebSocket·인게임은 이번 구현 범위에 포함하지 않습니다. [방 생성 기록](docx/matchroom-implementation.md)과 [멀티 목록·입장 기록](docx/multiplayer-lobby.md)에 구조, 예외 처리와 검증 결과를 정리했습니다.
