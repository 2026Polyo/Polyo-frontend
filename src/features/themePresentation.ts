/** 테마 외형은 현재 프론트에서 관리한다. ERD의 THEME 필드와 구분한다. */
export interface ThemePresentation {
  description?: string;
  colors: string[];
  glow?: boolean;
  jelly?: boolean;
  minecraft?: boolean;
  cat?: boolean;
}

const THEME_PRESENTATIONS: Record<string, ThemePresentation> = {
  theme_classic: {
    description: "익숙한 다섯 가지 색으로 돌아오는 가장 선명한 즐거움.",
    colors: ["#15caed", "#a8da27", "#ffbe24", "#a450ed", "#ff597c"],
  },
  theme_neon: {
    description:
      "어둠 속에서 더 선명하게. 고요한 우주를 밝히는 네온으로, 나만의 보드를 완성하세요.",
    colors: ["#00f5db", "#cf63ff", "#fd529f", "#67a0ff", "#d6ff50"],
    glow: true,
  },
  theme_jelly: {
    description:
      "손끝에 닿는 말랑함, 한 줄마다 터지는 즐거움. 반짝이는 유리 위에서 나만의 달콤한 플레이를 완성하세요.",
    colors: ["#43cce8", "#a6d94e", "#ffc14e", "#af8cec", "#f96e91"],
    jelly: true,
  },
  theme_minecraft: {
    description:
      "익숙한 블록, 끝없는 상상. 쌓고 캐는 즐거움으로 나만의 픽셀 세계를 완성하세요.",
    colors: ["#65e5dc", "#75c563", "#e8a023", "#aa7eaa", "#e7b9b3"],
    minecraft: true,
  },
  theme_cat: {
    description:
      "한 칸씩 모이는 포근함, 살며시 피어나는 미소. 하얀 고양이들과 함께 나만의 달콤한 꿈을 완성하세요.",
    colors: Array(5).fill("#ffffff"),
    cat: true,
  },
};

const FALLBACK_PRESENTATION: ThemePresentation = {
  colors: THEME_PRESENTATIONS.theme_classic.colors,
};

export function getThemePresentation(themeId: string): ThemePresentation {
  return Object.prototype.hasOwnProperty.call(THEME_PRESENTATIONS, themeId)
    ? THEME_PRESENTATIONS[themeId]
    : FALLBACK_PRESENTATION;
}
