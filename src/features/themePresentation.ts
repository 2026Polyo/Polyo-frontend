/** 테마 외형은 현재 프론트에서 관리한다. ERD의 THEME 필드와 구분한다. */
export interface ThemePresentation {
  description: string;
  colors: string[];
  glow?: boolean;
}

const THEME_PRESENTATIONS: Record<string, ThemePresentation> = {
  theme_classic: {
    description: "익숙한 다섯 가지 색으로 돌아오는 가장 선명한 즐거움.",
    colors: ["#15caed", "#a8da27", "#ffbe24", "#a450ed", "#ff597c"],
  },
  theme_neon: {
    description: "어두운 보드 위에서 빛나는 네온 컬러의 블록 테마.",
    colors: ["#00f5db", "#cf63ff", "#fd529f", "#67a0ff", "#d6ff50"],
    glow: true,
  },
  theme_pastel: {
    description: "부드러운 색감으로 채우는 나만의 작은 퍼즐.",
    colors: ["#a4d9f5", "#c6b9f3", "#f5bdd5", "#ffe2a0", "#aee1ce"],
  },
  theme_sunset: {
    description: "노을빛 오렌지와 핑크로 물드는 따뜻한 플레이.",
    colors: ["#ff946a", "#ffca67", "#f576a3", "#b77bea", "#f7ad76"],
  },
  theme_ocean: {
    description: "시원한 바다를 닮은 푸른빛 블록 컬렉션.",
    colors: ["#60e5df", "#35bce9", "#66a4ff", "#b1e9fa", "#54c8a7"],
  },
  theme_arcade: {
    description: "톡톡 튀는 컬러로 즐기는 오락실의 추억.",
    colors: ["#9dde39", "#ffda35", "#fb6b8f", "#9d74ff", "#49d9f2"],
  },
};

const FALLBACK_PRESENTATION: ThemePresentation = {
  description:
    "이 테마의 전용 미리보기는 준비 중입니다. 기본 블록으로 표시합니다.",
  colors: THEME_PRESENTATIONS.theme_classic.colors,
};

export function getThemePresentation(themeId: string): ThemePresentation {
  return THEME_PRESENTATIONS[themeId] ?? FALLBACK_PRESENTATION;
}
