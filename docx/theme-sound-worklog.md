# 젤리·마인크래프트·고양이 사운드 — 2026-11-05

## 목표·수정 범위

네온에 이어 나머지 세 테마의 배치·제거 사운드를 구현한다. React·TypeScript·Vite와 기존 `useThemeAudio`·플레이어별 공유 AudioContext를 재사용했다. 공통 버튼·팝업·게임오버·제거 보이스·콤보, 점수·판정·260ms 게임 제거 처리와 저장 형식은 유지했다.

입력은 성공한 배치의 실제 조각 색상, 제거 줄 수, 제거 직전 셀 스냅샷이다. 출력은 테마별 배치음, 제거음과 필요한 예약 음이다. 무효 배치·호버·불러오기는 새 재생 요청을 만들지 않는다. `createBoardFeedback`을 한 번 만들어 시각 효과와 소리가 같은 제거 색상을 사용한다.

## 테마별 결과

- 젤리팝: 0.19초 배치음 3종, 0.32초 제거음 2종. 낮고 둥근 탄성음을 중심으로 만들고 제거 시의 마찰 질감만 약하게 추가했다. 긴 젖은 소리나 강한 고주파를 피하도록 조정했다. 음량은 배치 0.42·제거 0.38이다.
- 고양이 드림: 약 0.29~0.5초의 합성 울음 6종. 기본 음높이·길이·상승/하강 억양이 다르다. 플레이어별 섞기 주머니를 사용해 모든 변형을 순환하되 직전 울음이 다음 주머니 경계에서도 바로 반복되지 않는다. 제거음은 약 0.34초의 부드러운 낮은 음이다.
- 마인크래프트: 18개 블록의 재질을 아래 조사표로 구분한다. 각 배치에 해당 재질음을 사용한다. 제거는 균열 중의 짧은 채굴음, 360ms+타일 파동 지연의 파괴음, 아이템 회전이 끝나는 1720ms의 획득음으로 이어진다. 획득음은 경험치 차임이 아닌 짧은 pop 성격으로 만들었다.

추가한 소리는 게임 원본 녹음을 복사한 파일이 아니라 직접 만든 PCM 합성 시안이다. Minecraft는 Mojang의 공개 Bedrock 리소스 팩에 있는 재질·이벤트 정의를 레퍼런스로 삼았다. 현재 시각 텍스처는 Java 기반이며 원본 Java 녹음을 그대로 재현했다고 주장하지 않는다. 음색과 기분에 관한 평가는 사용자 청음 후 조정한다.

## Minecraft 조사표

| 색상 | 블록 | 공식 재질 계열 |
| --- | --- | --- |
| cyan | diamond_block | metal |
| lime | slime_block | slime |
| amber | honeycomb_block | coral |
| rose | crimson_nylium | nylium |
| violet | purpur_block | stone |
| blue | lapis_block | stone |
| teal | warped_wart_block | nether_wart |
| orange | magma_block | stone |
| pink | cherry_planks | cherry_wood |
| green | moss_block | moss_block |
| indigo | crying_obsidian | stone |
| ghost | sea_lantern | glass |
| line | end_stone | stone |
| echo | amethyst_block | amethyst_block |
| golden | gold_block | metal |
| bomb | tnt | grass |
| fill | emerald_block | metal |
| boost | magenta_wool | cloth |

조회일 2026-11-05. 공개 샘플의 sound_definitions format_version은 1.26.60이다. Bedrock 이름 `slime`·`magma`·`seaLantern`을 현재 Java 스타일 식별자에 대응시켰다.

- [Mojang blocks.json](https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/blocks.json): 블록별 재질 확인.
- [Mojang sounds.json](https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/sounds.json): place·hit·break 이벤트와 높낮이 확인. metal 배치는 높은 stone 계열, glass 배치는 stone 계열이고 파괴는 glass 계열이다.
- [Mojang sound_definitions.json](https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/sounds/sound_definitions.json): `random.pop`이 item.pickup 자막에 대응하며 경험치 orb와 구분되는 것을 확인.

## 공통 처리·예외·성능

- 재질별 버퍼와 변형을 해당 플레이어의 테마 초기화에서 한 번 만든다. 게임 실행 중 새 사운드 파일 다운로드는 없다. 기존 공통 음원 로더의 오류 처리와 컨텍스트 공유를 유지했다.
- PCM은 유효 샘플레이트를 검사하고 진폭을 0.65 이내로 제한한다. 시작·끝 페이드를 적용하고 최초·마지막 샘플을 0으로 맞췄다.
- 배치 동시 소리는 2개, 일반 테마의 제거 묶음은 1개, Minecraft 제거 묶음은 2개로 제한한다. Minecraft 제거는 12개 재질당 hit/break와 획득음 1개, 최대 25개 예약이다. 재질 수에 따라 개별 gain을 나눠 소리를 겹친다.
- Web Audio의 source.start 시간으로 예약하며 JS 타이머를 추가하지 않았다. 묶음 중지 시 아직 시작하지 않은 획득음도 취소한다. 보통 배치로 앞선 Minecraft 아이템 획득음을 끊지 않는다.
- 랜덤 선택은 게임용 Math.random을 사용하지 않는다. 주머니·버퍼·예약은 플레이어별로 분리한다. 테마 전환·홈 복귀·언마운트 시 테마의 소리만 정리하며 공통음은 유지한다.
- 고양이의 느린 포먼트 가중치는 16샘플마다 갱신하고 배음을 점화식으로 계산한다. 배열을 샘플마다 할당하지 않는다. 재질별 고정 필터 계수도 합성 루프 밖에서 계산한다.

## 완료 조건과 검증

- 실제 프로젝트 전체 225개 테스트 통과, TypeScript 검사·Vite 배포 빌드 통과.
- 18색과 시각 블록 ID 대응, 특이 재질 분류, 시각 파동·획득 시간 일치, 64칸 제거의 예약 상한, 이전 묶음 취소, 고양이 6종·즉시 반복 방지, 젤리 수명·이득 제한을 확인했다.
- 샘플레이트 8kHz·48kHz에서 합성 샘플의 유효 값·진폭·시작/끝 무음을 검사했다. 첫 검사에서 -0과 +0의 비교 차이를 발견해 파형 시작과 끝을 명시적으로 0으로 정리했다.
- 실제 인앱 브라우저의 Web Audio에서 젤리의 비영(非零) 출력 파형, 고양이 연속 6회의 다른 버퍼 선택, 마인크래프트의 재질 5종별 버퍼와 혼합 제거 예약을 확인했다. 공통 버튼·팝업·게임오버 재생도 확인했고 브라우저 오류 로그는 없었다.
- 통합 확인은 실제 게임과 같은 useThemeAudio를 사용하는 작업용 미리듣기 화면에서 수행했다. 이번 확인을 실제 로그인·매치·서버 지급 통합 검증으로 해석하지 않는다.
- `tmp/theme-sound-preview.*`와 `output/audio/`의 비교용 WAV는 임시 작업 산출물로 커밋하지 않는다. 실제 게임은 동일한 합성 코드와 오디오 라우팅을 사용한다.
