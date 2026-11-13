# [백엔드 요청] 대전 중 상대 움직임(CURSOR) 전달

> Polyo-backend 작업용 프롬프트. 프론트(Polyo-frontend `feature/matchroom`)는 이 명세대로 이미 구현되어 있다.
> 모바일 레이아웃, 게임 중 이모티콘은 서버 변경이 필요 없다(기존 `EMOTE` 중계가 게임 중에도 동작). 이 문서는 **CURSOR 중계만** 다룬다.

## 목표

대전 게임 중, 자기 차례인 플레이어가 지금 어떤 블록을 들고 있고 보드의 어디에 놓으려 하는지를 상대에게 실시간으로 전달한다.
서버는 **판정하지 않고 중계만** 한다. 게임 상태(`MatchGame`)와 `STATE` 메시지는 바꾸지 않는다.

## 기술 스택 / 관련 코드

- Spring Boot WebSocket, `polyo/src/main/java/com/polyo/polyo/game/`
- `GameWebSocketHandler.dispatch()` — 메시지 type 분기. `EMOTE` 분기와 같은 방식으로 `CURSOR` 분기를 추가한다.
- `GameHub.emote()` — 방 채널 조회, `synchronized (channel)`, 플레이어별 간격 제한, JSON 직렬화 후 전송. **이 구현 방식을 그대로 따른다.**
- 테스트: `polyo/src/test/java/com/polyo/polyo/game/GameSocketTests.java`의 기존 EMOTE 테스트 패턴을 재사용한다.

## 입력 (클라이언트 → 서버)

```json
{ "type": "CURSOR", "pieceUid": "p-12", "row": 3, "col": 5 }
{ "type": "CURSOR", "pieceUid": "p-12", "row": null, "col": null }
{ "type": "CURSOR", "pieceUid": null, "row": null, "col": null }
```

| 필드 | 의미 |
|---|---|
| `pieceUid` | 들고 있는 블록의 uid(트레이의 `uid`). `null`이면 아무것도 안 들고 있음(선택 해제/블록 놓음) |
| `row`, `col` | 블록을 놓을 위치(블록 기준점의 좌상단, `PLACE`의 row/col과 같은 좌표계). 보드 밖이거나 놓을 수 없는 위치면 둘 다 `null` |

- 클라이언트는 값이 바뀔 때만, 최대 100ms에 한 번 보낸다(마지막 값은 반드시 보냄).

## 출력 (서버 → 상대 클라이언트)

```json
{ "type": "CURSOR", "userId": "7", "pieceUid": "p-12", "row": 3, "col": 5 }
```

- **보낸 사람을 제외한** 같은 방의 세션에만 보낸다(EMOTE와 다름: 에코하지 않는다).
- 받은 값을 그대로 전달하고 `userId`만 서버가 채운다(클라이언트가 보낸 userId는 무시).

## 검증 규칙과 예외 처리

CURSOR는 자주 오는 장식용 메시지이므로 **어떤 경우에도 `ERROR`를 보내지 않고 조용히 버린다.**
(클라이언트는 `ERROR`를 화면에 표시하고, 놓기 요청 대기 상태를 풀기 때문에 오류가 쏟아지면 안 된다.)

| 상황 | 처리 |
|---|---|
| 게임이 없거나(대기실) 끝난 게임 | 버림 |
| 보낸 사람이 현재 차례가 아님 | 버림 |
| `pieceUid`가 문자열/null이 아님, 64자 초과 | 버림 |
| `row`/`col`이 정수/null이 아님, 둘 중 하나만 null, 범위 `-8 ≤ v < 8` 밖 | 버림 |
| 같은 플레이어가 50ms 안에 다시 보냄 | 버림(마지막 값 보장은 클라이언트의 trailing send가 담당) |
| 방 채널이 없음 | 버림(EMOTE처럼 `ROOM_CLOSED`를 던지지 않는다) |
| 상대 세션이 없음/끊김 | 버림 |

- `pieceUid`가 현재 트레이에 있는지는 검사하지 않아도 된다(클라이언트가 트레이에 없는 uid는 무시함).
- 간격 기록은 `RoomChannel`에 `lastCursorAt` 맵을 따로 두고, `lastEmoteAt`과 섞지 않는다.

## 하지 말 것

- `MatchGame`, `STATE` 페이로드, 턴 타이머 변경 금지.
- 기존 `PLACE`/`EMOTE`/`READY`/`START`/`FORFEIT` 동작 변경 금지.
- CURSOR를 DB/로그에 남기지 않기(로그는 debug 이하).

## 하위 호환

- 이 기능이 없는 서버는 CURSOR에 `INVALID_MESSAGE`를 돌려주는데, 프론트는 CURSOR 직후 받은 `INVALID_MESSAGE`를 보면 해당 연결에서 CURSOR 전송을 멈추고 오류를 표시하지 않는다. 그러니 배포 순서는 상관없다.

## 완료 조건

1. 게임 중 현재 차례 플레이어의 CURSOR가 상대에게만 `userId`가 붙어 전달된다.
2. 차례가 아닌 플레이어, 대기실, 끝난 게임의 CURSOR는 아무에게도 가지 않는다.
3. 잘못된 형식/범위/50ms 내 재전송은 버려지고, 보낸 사람에게 `ERROR`가 가지 않는다.
4. 기존 테스트 전부 통과.

## 테스트

`GameSocketTests`에 추가:
- 현재 차례 플레이어가 보낸 CURSOR를 상대가 받고, 보낸 사람은 받지 않는다.
- `pieceUid: null, row: null, col: null`도 그대로 전달된다.
- 차례가 아닌 플레이어의 CURSOR는 전달되지 않는다.
- 게임 시작 전(WAITING) CURSOR는 전달되지 않고 ERROR도 없다.
- `row: 99`, `row`만 null, `pieceUid: 123` → 전달 안 됨, ERROR 없음.
- 연속 2회(50ms 이내) → 1회만 전달.

수동 확인: 두 브라우저로 대전 → 내 차례에 블록을 들고 보드 위를 움직이면 상대 화면의 내 보드(상대 입장에선 상대 보드)에 반투명 미리보기가 따라온다.
