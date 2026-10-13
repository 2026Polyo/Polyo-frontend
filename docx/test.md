# Polyomino 아키텍처와 실행 흐름 분석

이 문서는 현재 `poliyomino` 프로젝트의 목적, React + TypeScript 아키텍처, 런타임 흐름, 그리고 유지보수 관점의 개선방안을 정리한 문서입니다. 기준 파일은 `src/App.tsx`, `src/features`, `src/hooks`, `src/utils`, `src/components`, `src/constants`, `package.json`입니다.

## 1. 프로젝트 목적

`polyomino-block-blast`는 8x8 보드에 폴리오미노 블록을 배치해 행/열을 지우는 퍼즐 게임입니다. 단순한 블록 배치 게임 위에 점수 성장, 콤보, 증강, 아이템, 특수 블록, 덱 구성, 저장/이어하기를 얹어 반복 플레이 동기를 만드는 것이 핵심 목적입니다.

현재 프로젝트가 지향하는 사용자 경험은 다음과 같습니다.

- 시작 화면에서 새 게임, 이어하기, 덱 구성을 선택한다.
- 플레이 화면에서 3개의 트레이 블록을 골라 보드에 배치한다.
- 행/열 제거, 콤보, 특수 블록, 증강 효과로 점수를 얻는다.
- 점수 기준에 도달하면 증강 또는 블록 보상을 선택한다.
- 획득한 특수 블록과 잠금 해제 블록은 다음 게임의 덱 구성에 영향을 준다.
- 진행 중 게임과 최고 점수는 localStorage에 저장된다.

## 2. 기술 스택과 프로젝트 형태

- 프레임워크: React 19
- 언어: TypeScript strict mode
- 빌드 도구: Vite
- 테스트: Vitest
- 아이콘: lucide-react
- 사운드: Web Audio API
- 저장소: 브라우저 localStorage

`package.json` 기준 스크립트는 `dev`, `build`, `preview`, `test`, `typecheck`로 단순합니다. `build`는 `tsc --noEmit` 후 Vite 빌드를 수행하므로 타입 안정성과 번들 검증을 함께 합니다.

## 3. 전체 레이어 구조

현재 구조는 작은 게임 프로젝트로서는 꽤 명확한 레이어를 가지고 있습니다.

```text
src/
  main.tsx          React 진입점
  App.tsx           게임 전체 상태와 이벤트 흐름을 조율하는 루트 컨테이너
  types.ts          도메인 타입 정의
  constants/        보드 크기, 블록 카탈로그, 튜닝값
  features/         점수, 증강, 아이템, 특수 블록, 저장 등 게임 규칙
  hooks/            React 상태/이벤트와 도메인 로직을 연결하는 커스텀 훅
  utils/            순수 계산 유틸리티
  components/       UI 컴포넌트와 모달
  styles/           화면별 CSS
```

레이어별 책임은 다음과 같이 볼 수 있습니다.

| 레이어 | 주요 책임 | 대표 파일 |
|---|---|---|
| Entry | React root 생성 | `src/main.tsx` |
| App Shell | 게임 상태, 화면 전환, 이벤트 오케스트레이션 | `src/App.tsx` |
| Domain Features | 증강, 아이템, 특수 블록, 저장, 배치 결과 계산 | `src/features/*.ts` |
| Pure Utils | 보드 복제/라인 제거/중력/트레이 생성/배치 가능성 계산 | `src/utils/*.ts` |
| Hooks | 선택 상태, 오디오, 덱 빌더, 최고점, UI 펄스 | `src/hooks/*.ts` |
| Components | 보드, 트레이, 점수판, 모달, 시작 화면 | `src/components/*.tsx` |
| Constants | 보드 크기, 블록 목록, 저장 키, 스냅 거리 | `src/constants/*.ts` |

## 4. 현재 아키텍처의 핵심 특징

### 4.1 App.tsx 중심 오케스트레이션

`App.tsx`는 현재 프로젝트의 중심 컨테이너입니다. `board`, `deck`, `specialPieces`, `ghostCells`, `goldenCells`, `bombCells`, `boostCells`, `tray`, `score`, `augmentState`, 각종 모달 open 상태, 게임 phase를 직접 보유합니다.

장점은 흐름을 한 파일에서 추적하기 쉽다는 점입니다. 게임의 주요 이벤트인 새 게임, 이어하기, 블록 배치, 증강 선택, 특수 보상 선택, 설정 메뉴 이동이 모두 `App.tsx`에 모여 있습니다.

단점은 상태 종류와 이벤트가 많아질수록 `App.tsx`가 점점 커지고, 새로운 기능을 추가할 때 루트 컴포넌트의 변경 범위가 넓어진다는 점입니다. 현재 `App.tsx`는 화면 조립, 도메인 이벤트, 저장 사이드이펙트, 오디오 트리거, 모달 제어를 모두 포함합니다.

### 4.2 도메인 로직의 순수 함수화

가장 좋은 구조적 선택은 핵심 게임 규칙이 상당 부분 순수 함수로 분리되어 있다는 점입니다.

- `features/resolvePlacement.ts`: 한 번의 배치가 만든 보드 변화, 줄 제거, 특수 블록 효과, 점수 획득을 계산합니다.
- `features/augments.ts`: 증강 레벨, 목표 점수, 콤보 상태, 점수 배율을 계산합니다.
- `utils/placement.ts`: 배치 가능성, 가장 가까운 배치 위치, 주변 빈 칸을 계산합니다.
- `utils/boardUtils.ts`: 줄 제거, 중력 시뮬레이션, 주변 블록/인접 줄 계산을 담당합니다.
- `utils/tray.ts`: 3개 트레이 생성, 리롤, 완주 가능한 트레이 탐색을 담당합니다.

이 구조 덕분에 `resolvePlacement`, `augments`, `items`, `specials`, `placement`, `boardUtils`는 Vitest로 비교적 쉽게 검증할 수 있습니다.

### 4.3 Feature 모듈 중심의 게임 규칙

`features` 폴더는 게임 규칙별로 나뉩니다.

- 증강: `augments.ts`
- 아이템: `items.ts`
- 저장: `savedGame.ts`
- 특수 보상 레지스트리: `specials.ts`
- 특수 블록별 효과: `ghosts.ts`, `lineBlocks.ts`, `echoBlocks.ts`, `goldenBlocks.ts`, `bombBlocks.ts`, `fillBlocks.ts`, `boostBlocks.ts`
- 특수 블록 검증 공통화: `specialPiece.ts`
- 클리어 피드백: `clearFeedback.ts`
- 특수 블록 보관함/로드아웃: `specialStash.ts`

특수 블록은 `specials.ts`의 레지스트리를 통해 라벨, 설명, 생성 함수, 검증 함수를 한곳에서 묶습니다. 이 방식은 새 특수 블록을 추가할 때 변경 지점을 명확하게 해 줍니다.

### 4.4 Hook은 React 연결부로 사용

`hooks` 폴더는 순수 도메인 로직과 React 이벤트/상태를 연결합니다.

- `usePieceSelection`: 트레이 블록 선택, 커서 위치, 보드 hover, 스냅 배치, 미리보기 칸 계산을 담당합니다.
- `useDeckBuilderState`: 특수 보관함, 기본 덱, 로드아웃, 잠금 해제 상태를 localStorage와 동기화합니다.
- `useGameAudio`: 사운드 파일을 디코딩하고 배치/클리어/팝업/게임오버 사운드를 재생합니다.
- `useBestScore`: 최고 점수를 localStorage에 저장합니다.
- `useComboEffect`, `usePulseLabel`: 짧게 나타나는 시각 효과 상태를 관리합니다.

`features/items.ts`의 `useItemSystem`도 실질적으로 hook입니다. 파일 위치는 `features`지만 React state와 side effect를 직접 다룹니다.

### 4.5 UI 컴포넌트는 대체로 표시 중심

`components` 폴더는 보드, 트레이, 점수판, 모달, 시작 화면을 담당합니다.

- 보드/블록: `Board.tsx`, `PieceShape.tsx`, `PiecePreview.tsx`, `PieceTray.tsx`
- 상태 표시: `ScoreBoard.tsx`, `AugmentPanel.tsx`, `ItemSlots.tsx`
- 시작/덱: `StartScreen.tsx`, `StartDeckModal.tsx`, `DeckModal.tsx`
- 모달: `AugmentChoiceModal.tsx`, `SpecialChoiceModal.tsx`, `BlockRewardModal.tsx`, `RerollModal.tsx`, `GameOver.tsx`
- 설정: `GameSettingsMenu.tsx`

이 컴포넌트들은 대부분 props를 받아 표시하고 이벤트를 위로 올립니다. 다만 `RerollModal`은 강화 리롤 단계와 후보 선택 상태를 내부에서 직접 관리하므로 작은 feature UI 컨테이너 성격도 갖습니다.

## 5. 런타임 흐름

### 5.1 앱 시작 흐름

1. `src/main.tsx`가 `root` DOM을 찾습니다.
2. `createRoot(rootElement).render(<App />)`로 루트 앱을 렌더링합니다.
3. `App.tsx`는 최초 렌더 시 `loadSavedGame`으로 localStorage 저장본을 읽습니다.
4. 저장본이 유효하면 보드, 트레이, 점수, 증강, 아이템, 특수 마크를 복원합니다.
5. 저장본이 없거나 유효하지 않으면 빈 보드와 기본 덱을 기준으로 초기 상태를 만듭니다.
6. 초기 화면은 `gamePhase === "start"` 기준으로 `StartScreen`입니다.

### 5.2 새 게임 시작 흐름

1. 시작 화면에서 새 게임을 누릅니다.
2. `startGame`이 현재 사용 가능한 기본 블록만 필터링합니다.
3. 기본 덱이 비었으면 `DEFAULT_DECK`을 사용합니다.
4. 특수 보관함에서 선택한 로드아웃을 현재 게임 특수 블록으로 가져옵니다.
5. `resetGame`이 보드, 점수, 증강, 아이템, 특수 마크, 모달 상태를 초기화합니다.
6. `nextTray`가 현재 보드에서 사용할 수 있는 새 트레이 3개를 생성합니다.
7. `gamePhase`가 `playing`으로 바뀌며 플레이 화면이 표시됩니다.

### 5.3 블록 선택과 미리보기 흐름

1. 플레이어가 트레이의 블록을 클릭합니다.
2. `usePieceSelection`이 선택된 `uid`, 커서 조각, 잡은 기준 칸을 저장합니다.
3. 보드 hover 위치가 바뀌면 목표 배치 좌표가 계산됩니다.
4. `getClosestPlacement`가 현재 보드에서 가장 가까운 유효 배치 위치를 찾습니다.
5. 스냅 거리 밖이면 invalid preview로 표시합니다.
6. 유효하면 `previewCells`, `previewClearingCells`, `previewGain`이 계산됩니다.
7. 점수판은 해당 위치에 놓았을 때 얻을 점수를 `+n`으로 보여줍니다.

### 5.4 배치 처리 흐름

1. 보드 칸을 클릭하면 `handleCellClick`이 선택 블록과 기준 칸을 바탕으로 배치 후보 좌표를 계산합니다.
2. 후보가 유효하고 스냅 거리 안이면 `placePieceAt`을 호출합니다.
3. `placePieceAt`은 입력 잠금 상태, 배치 가능 여부를 확인합니다.
4. `resolvePlacement`가 배치 결과를 계산합니다.
5. 배치음, 클리어 사운드, 클리어 라벨이 재생/표시됩니다.
6. 보드, 클리어 하이라이트, 점수, 특수 마크 상태가 갱신됩니다.
7. 사용한 트레이 슬롯은 비워집니다.
8. 트레이가 모두 비면 `nextTray`로 새 트레이를 만듭니다.
9. 되돌리기용 스냅샷을 저장합니다.
10. `getNextAugmentStateAfterPlacement`로 콤보, 콤보 유지, 과열, 아이템 연계 상태를 갱신합니다.
11. 제거될 칸이 있으면 260ms 후 settled board로 정리합니다.

### 5.5 resolvePlacement 내부 흐름

`resolvePlacement`는 게임 규칙의 중심 순수 함수입니다.

1. 에코 블록이면 배치 전 보드의 채워진 칸 수로 보너스를 계산합니다.
2. `placePiece`로 보드에 조각을 놓고 일반 줄 제거 후보를 계산합니다.
3. 고스트 블록이면 겹친 칸을 별도 마크로 기록합니다.
4. 라인 블록이면 각 배치 칸의 행/열을 제거합니다.
5. 채우기 블록이면 상하좌우 인접 빈 칸을 채운 뒤 줄 제거를 다시 계산합니다.
6. 일반 블록이면 확산 채우기 증강을 확률적으로 적용합니다.
7. 확산 제거 증강을 확률적으로 적용합니다.
8. 골든/폭탄/강화 마크 신규 위치를 계산합니다.
9. 보드 점유율, 제거 칸 수, 인접 블록 수를 바탕으로 증강 점수를 계산합니다.
10. 고스트, 골든, 폭탄 보너스를 계산합니다.
11. 기존 강화 칸 수에 따른 배율을 적용해 최종 점수를 만듭니다.
12. 즉시 표시할 보드와 최종 settled board를 반환합니다.

### 5.6 증강/보상 선택 흐름

1. 점수가 `augmentState.nextChoiceScore` 이상이 되면 선택 조건이 만족됩니다.
2. 게임 오버, 클리어 애니메이션, 보상 모달 등 방해 상태가 없을 때 500ms 뒤 선택 UI가 열립니다.
3. 총 증강 레벨 기준으로 3회마다 일반 증강 대신 특수 보상 후보가 열립니다.
4. 일반 증강 선택 시 `chooseAugment`가 해당 레벨을 올리고 다음 목표 점수를 갱신합니다.
5. 특수 블록 선택 시 현재 게임 특수 덱과 보관함에 추가합니다.
6. 잠긴 기본 블록 선택 시 영구 잠금 해제하고 현재 덱에도 추가합니다.
7. 보상 선택은 증강 선택 슬롯을 사용한 것으로 처리되어 `advanceAugmentSchedule`이 호출됩니다.

### 5.7 아이템 흐름

1. `useItemSystem`은 현재 콤보와 직전 보상 콤보를 비교합니다.
2. 콤보가 아이템 획득 간격을 넘으면 빈 슬롯에 랜덤 아이템을 넣습니다.
3. 되돌리기는 저장된 직전 스냅샷으로 상태를 복원합니다.
4. 리롤은 트레이 일부를 바꾸며, 강화 레벨에 따라 전용 모달을 사용합니다.
5. 중력은 보드의 블록을 한 칸씩 떨어뜨리고, 행 제거가 생기면 cascade를 계속합니다.
6. 아이템 사용 시 사용 점수 보너스와 다음 배치 점수 보너스 플래그가 적용될 수 있습니다.

### 5.8 저장과 이어하기 흐름

1. 플레이 중이고 주요 상태가 바뀌면 `saveCurrentGame`이 localStorage에 스냅샷을 씁니다.
2. 저장 항목은 보드, 트레이, 점수, 덱, 증강, 아이템, 특수 블록, 특수 마크, 되돌리기 스냅샷입니다.
3. 앱 시작 시 `loadSavedGame`이 보드와 트레이 구조를 검증합니다.
4. 유효하지 않으면 저장본을 무시합니다.
5. 시작 화면은 저장된 진행이 있고 가능한 이동이 있으면 이어하기를 보여줍니다.

## 6. 테스트 구조

현재 테스트는 UI보다 도메인 규칙에 집중되어 있습니다.

- `features/__tests__/resolvePlacement.test.ts`: 배치, 줄 제거, 특수 블록 효과, preview deterministic behavior, 올클리어 보너스 검증
- `features/__tests__/augments.test.ts`: 증강 레벨, 점수 계산, 목표 점수, 콤보 관련 상태 검증
- `features/__tests__/items.test.ts`: 아이템 슬롯, 저장 마이그레이션, 아이템 획득/사용 규칙 검증
- `features/__tests__/specials.test.ts`: 특수 블록 생성과 보상 후보 검증
- `utils/__tests__/placement.test.ts`: 배치 가능성, placement 후보, 고스트 예외 규칙 검증
- `utils/__tests__/boardUtils.test.ts`: 줄 제거, 중력, 인접 줄/칸 계산 검증

이 테스트 구조는 현재 아키텍처의 강점입니다. 게임 규칙이 순수 함수로 빠져 있기 때문에 UI 없이도 핵심 규칙을 검증할 수 있습니다.

## 7. 현재 아키텍처의 장점

1. 핵심 게임 규칙이 UI와 분리되어 있다.
   - `resolvePlacement`, `augments`, `boardUtils`, `placement`, `tray`는 테스트 가능한 함수 중심입니다.

2. 특수 블록 확장 지점이 명확하다.
   - 특수 블록별 파일과 `specials.ts` 레지스트리가 있어 새 블록을 추가할 때 구조가 보입니다.

3. 저장 데이터 검증이 있다.
   - `savedGame.ts`가 보드와 트레이 구조를 확인하고, 아이템 구버전 데이터도 마이그레이션합니다.

4. 트레이 생성이 플레이 가능성을 고려한다.
   - 단순 랜덤이 아니라 현재 보드에서 3개를 모두 둘 수 있는지 탐색합니다.

5. TypeScript strict 설정이 켜져 있다.
   - `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`가 유지보수 안전성을 높입니다.

6. 게임 규칙 테스트가 이미 존재한다.
   - 기능 추가 시 회귀를 잡을 기반이 있습니다.

## 8. 현재 아키텍처의 리스크

1. `App.tsx`가 너무 많은 책임을 가진다.
   - 게임 상태, 저장, 오디오, 모달, 배치 이벤트, 보상 선택, 화면 전환이 모두 한 파일에 있습니다.

2. `features/items.ts`가 feature와 hook 역할을 동시에 가진다.
   - 파일명은 도메인 feature지만 React hook, timer, state setter, side effect를 포함합니다.

3. `Set<string>` 기반 특수 마크가 여러 상태로 흩어져 있다.
   - `ghostCells`, `goldenCells`, `bombCells`, `boostCells`가 별도 상태라 저장/복원/중력/배치 처리에서 함께 움직여야 합니다.

4. localStorage 접근이 여러 위치에 분산되어 있다.
   - 진행 저장, 최고 점수, 덱/보관함 저장이 각각 다른 파일에서 직접 localStorage를 다룹니다.

5. UI 문구 인코딩 문제가 보인다.
   - 일부 파일의 한국어 문자열이 깨져 있어 사용자-facing 문구 유지보수성이 떨어집니다.

6. 통합 시나리오 테스트가 부족하다.
   - 순수 로직 테스트는 좋지만, 새 게임 -> 배치 -> 증강 선택 -> 저장 -> 이어하기 같은 사용자 흐름 테스트는 부족합니다.

7. App state 갱신 순서가 암묵적이다.
   - 배치 시 점수, 트레이, 증강, 되돌리기 스냅샷, 클리어 타이머가 순서에 의존합니다.

## 9. 개선방안

### 9.1 우선순위 높음: App.tsx를 게임 컨테이너 훅으로 분리

현재 `App.tsx`는 UI 조립과 게임 이벤트 처리를 동시에 합니다. 먼저 `useGameSession` 같은 훅을 만들어 게임 상태와 액션을 묶는 것이 좋습니다.

제안 구조:

```text
src/hooks/useGameSession.ts
  board, tray, score, phase, modals, marks, augmentState
  startGame, continueGame, resetGame, placePieceAt
  chooseAugment, chooseReward, open/close modal actions

src/App.tsx
  useGameSession 호출
  StartScreen 또는 PlayScreen 렌더링
```

기대 효과:

- `App.tsx`가 화면 조립에 집중합니다.
- 게임 이벤트 테스트가 쉬워집니다.
- 새 기능 추가 시 루트 컴포넌트 변경량이 줄어듭니다.

주의점:

- 한 번에 대규모 이동하지 말고, 먼저 저장/시작/배치 중 하나의 작은 액션 그룹부터 옮기는 것이 안전합니다.

### 9.2 우선순위 높음: 플레이 화면을 PlayScreen으로 분리

현재 `App.tsx`의 반환부에는 플레이 화면 UI가 길게 들어 있습니다. 이를 `components/PlayScreen.tsx` 또는 `screens/PlayScreen.tsx`로 분리하면 화면 구조가 명확해집니다.

제안 구조:

```text
src/screens/StartScreen.tsx
src/screens/PlayScreen.tsx
src/components/...
```

기대 효과:

- 시작 화면과 플레이 화면의 관심사가 분리됩니다.
- `App.tsx`는 phase 라우터처럼 작아집니다.
- PlayScreen props를 기준으로 필요한 상태와 액션이 드러납니다.

### 9.3 우선순위 높음: 특수 마크 상태를 하나의 객체로 묶기

현재 특수 마크는 `ghostCells`, `goldenCells`, `bombCells`, `boostCells`로 나뉘어 있습니다. 이 네 상태는 대부분 같이 저장되고 같이 이동합니다.

제안 타입:

```ts
interface SpecialMarks {
  ghost: Set<string>;
  golden: Set<string>;
  bomb: Set<string>;
  boost: Set<string>;
}
```

또는 저장 안정성을 위해 내부 상태도 배열/Record 형태로 통일할 수 있습니다.

기대 효과:

- 저장/복원/중력 remap 로직이 단순해집니다.
- 새 특수 마크 추가 시 상태 추가 지점이 줄어듭니다.
- `resolvePlacement` 입력/출력 타입이 더 읽기 쉬워집니다.

주의점:

- `Set`은 React 상태 업데이트에서 불변성을 놓치기 쉬우므로 새 객체/새 Set 생성 규칙을 명확히 해야 합니다.

### 9.4 우선순위 중간: features/items.ts를 도메인과 hook으로 나누기

`items.ts`에는 아이템 상수/검증/마이그레이션과 `useItemSystem` hook이 함께 있습니다.

제안 분리:

```text
src/features/items.ts          순수 아이템 규칙, 상수, 저장 마이그레이션
src/hooks/useItemSystem.ts     React 상태, timer, setter 연결
```

기대 효과:

- feature 레이어는 프레임워크 독립성을 유지합니다.
- hook 테스트와 순수 로직 테스트를 분리할 수 있습니다.
- `features` 폴더의 의미가 더 일관됩니다.

### 9.5 우선순위 중간: 저장소 어댑터 만들기

현재 localStorage는 `savedGame.ts`, `specialStash.ts`, `useBestScore.ts`에서 직접 사용합니다.

제안:

```text
src/storage/localStorageAdapter.ts
  getJson(key)
  setJson(key, value)
  getNumber(key)
  setNumber(key, value)
```

기대 효과:

- try/catch와 JSON parse/stringify 중복이 줄어듭니다.
- 저장 실패, quota 초과, private mode 같은 예외 처리를 일관화할 수 있습니다.
- 테스트에서 storage mock을 갈아끼우기 쉬워집니다.

### 9.6 우선순위 중간: 게임 이벤트를 reducer로 모델링

상태가 늘어나면 `useState` 여러 개와 이벤트 함수가 복잡해집니다. 장기적으로는 `useReducer` 또는 작은 상태 머신을 고려할 수 있습니다.

예시 이벤트:

- `START_GAME`
- `CONTINUE_GAME`
- `PLACE_PIECE`
- `CLEAR_ANIMATION_FINISHED`
- `CHOOSE_AUGMENT`
- `CHOOSE_REWARD`
- `USE_ITEM`
- `RESET_GAME`
- `GO_HOME`

기대 효과:

- 상태 전이가 명시적입니다.
- 배치 처리처럼 순서가 중요한 이벤트를 테스트하기 쉬워집니다.
- 게임 오버, 모달, 입력 잠금 같은 파생 상태를 정리하기 좋습니다.

주의점:

- 지금 당장 전부 reducer로 바꾸면 변경 위험이 큽니다.
- 먼저 `phase`, `modal`, `inputLock` 같은 UI 상태부터 작게 묶는 방식이 안전합니다.

### 9.7 우선순위 중간: 통합 흐름 테스트 추가

현재 순수 로직 테스트는 좋지만, 실제 사용자 흐름 단위 테스트가 부족합니다.

추천 테스트:

- 저장된 게임이 유효할 때 시작 화면에 이어하기가 노출되는지
- 새 게임 시작 시 덱/특수 로드아웃이 반영되는지
- 트레이 하나 배치 후 점수/트레이/되돌리기 스냅샷이 함께 갱신되는지
- 게임 오버 직전 되돌리기 아이템이 자동 사용되는지
- 증강 목표 점수 도달 시 일반 증강과 보상 선택이 번갈아 열리는지

도구는 현재 Vite/Vitest 기반이므로 React Testing Library 도입을 검토할 수 있습니다. 다만 새 의존성 추가 전에는 순수 hook/utility 테스트를 먼저 늘리는 방식이 더 가볍습니다.

### 9.8 우선순위 낮음: 문구와 인코딩 정리

현재 README와 일부 UI 문자열은 깨진 한국어로 보입니다. 사용자-facing 텍스트가 계속 늘어날 프로젝트라면 문구 리소스를 정리하는 것이 좋습니다.

제안:

```text
src/i18n/ko.ts
  buttons
  modals
  augmentLabels
  itemLabels
  specialLabels
```

기대 효과:

- 깨진 문구를 한 번에 복구할 수 있습니다.
- UI 컴포넌트에서 문자열 노이즈가 줄어듭니다.
- 나중에 영문/한글 전환도 쉬워집니다.

### 9.9 우선순위 낮음: 타입 이름과 폴더 의미 일관화

현재 `features/items.ts`에 hook이 있고, `components/StartScreen.tsx`와 `components/StartDeckModal.tsx`가 screen 역할도 합니다. 프로젝트가 커질 경우 아래처럼 구분하면 좋습니다.

```text
src/screens/
src/components/
src/features/
src/hooks/
src/storage/
src/domain/ 또는 src/game/
```

다만 지금 규모에서는 과한 폴더 재편보다 `App.tsx` 책임 분리와 items hook 분리가 먼저입니다.

## 10. 추천 리팩터링 순서

1. UI 문자열 인코딩 문제를 별도 이슈로 정리한다.
2. `App.tsx`에서 플레이 화면 JSX를 `PlayScreen`으로 분리한다.
3. `features/items.ts`에서 `useItemSystem`을 `hooks/useItemSystem.ts`로 이동한다.
4. `SpecialMarks` 타입을 도입해 4종 특수 마크 상태를 묶는다.
5. 저장소 어댑터를 만들고 localStorage 접근을 한곳으로 모은다.
6. `useGameSession`을 도입해 start/reset/place/reward 흐름을 이동한다.
7. 통합 흐름 테스트를 추가한다.
8. 필요해지면 reducer/state machine으로 전환한다.

이 순서가 좋은 이유는 가장 큰 위험인 `App.tsx` 비대화를 줄이면서도, 게임 규칙의 순수 함수와 기존 테스트 기반을 최대한 보존하기 때문입니다.

## 11. 개선 후 목표 아키텍처 예시

```text
src/
  main.tsx
  App.tsx
  screens/
    StartScreen.tsx
    PlayScreen.tsx
  components/
    Board.tsx
    PieceTray.tsx
    ScoreBoard.tsx
    modals/
  game/
    resolvePlacement.ts
    scoring.ts
    augments.ts
    items.ts
    specials/
  hooks/
    useGameSession.ts
    usePieceSelection.ts
    useItemSystem.ts
    useGameAudio.ts
  storage/
    localStorageAdapter.ts
    savedGameStorage.ts
    deckStorage.ts
  utils/
    boardUtils.ts
    placement.ts
    tray.ts
  constants/
    gameData.ts
    config.ts
  types.ts
```

이 구조는 현재 프로젝트를 완전히 갈아엎자는 의미가 아닙니다. 지금 코드가 이미 가지고 있는 좋은 분리, 특히 순수 도메인 로직과 테스트 가능한 유틸리티를 살리면서 React 컨테이너의 책임을 조금씩 낮추는 방향입니다.

## 12. 결론

현재 프로젝트는 “React UI + 순수 게임 규칙 + 커스텀 훅 + localStorage 저장” 구조로 잘 출발해 있습니다. 특히 `resolvePlacement`, `augments`, `boardUtils`, `tray`처럼 핵심 규칙이 테스트 가능한 함수로 분리된 점은 강점입니다.

가장 중요한 개선 포인트는 `App.tsx`의 책임을 줄이는 것입니다. 게임이 더 커질수록 루트 컴포넌트 하나가 모든 상태와 이벤트를 들고 있는 구조는 변경 비용을 높입니다. 우선 PlayScreen 분리, items hook 이동, 특수 마크 상태 묶기, 저장소 어댑터 도입부터 진행하면 현재 구조를 해치지 않으면서도 유지보수성이 좋아질 것입니다.
