/** Read DTO for THEME(id, name, price). IDs are opaque strings at the UI boundary;
 * the backend's actual ID type must be confirmed when the API is connected. */
export interface ShopTheme {
  themeId: string;
  name: string;
  price: number;
}

/** Frontend-only presentation: these fields do not exist in the supplied ERD. */
export interface ThemePresentation {
  description: string;
  colors: string[];
  glow?: boolean;
}

const PRESENTATIONS: Record<string, ThemePresentation> = {
  theme_classic: { description: "익숙한 다섯 가지 색으로 돌아오는 가장 선명한 즐거움.", colors: ["#15caed", "#a8da27", "#ffbe24", "#a450ed", "#ff597c"] },
  theme_neon: { description: "어두운 보드 위에서 빛나는 네온 컬러의 블록 테마.", colors: ["#00f5db", "#cf63ff", "#fd529f", "#67a0ff", "#d6ff50"], glow: true },
  theme_pastel: { description: "부드러운 색감으로 채우는 나만의 작은 퍼즐.", colors: ["#a4d9f5", "#c6b9f3", "#f5bdd5", "#ffe2a0", "#aee1ce"] },
  theme_sunset: { description: "노을빛 오렌지와 핑크로 물드는 따뜻한 플레이.", colors: ["#ff946a", "#ffca67", "#f576a3", "#b77bea", "#f7ad76"] },
  theme_ocean: { description: "시원한 바다를 닮은 푸른빛 블록 컬렉션.", colors: ["#60e5df", "#35bce9", "#66a4ff", "#b1e9fa", "#54c8a7"] },
  theme_arcade: { description: "톡톡 튀는 컬러로 즐기는 오락실의 추억.", colors: ["#9dde39", "#ffda35", "#fb6b8f", "#9d74ff", "#49d9f2"] }
};

export function getThemePresentation(themeId: string): ThemePresentation {
  return PRESENTATIONS[themeId] ?? {
    description: "이 테마의 전용 미리보기는 준비 중입니다. 기본 블록으로 표시합니다.",
    colors: PRESENTATIONS.theme_classic.colors
  };
}

export interface ThemePage {
  items: ShopTheme[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// Fixture IDs and prices are examples, not seeded database records or account data.
const THEMES: ShopTheme[] = [
  { themeId: "theme_classic", name: "클래식 블록", price: 500 },
  { themeId: "theme_neon", name: "네온 나이트", price: 1200 },
  { themeId: "theme_pastel", name: "파스텔 드림", price: 1000 },
  { themeId: "theme_sunset", name: "선셋 글로우", price: 1500 },
  { themeId: "theme_ocean", name: "오션 브리즈", price: 1200 },
  { themeId: "theme_arcade", name: "레트로 아케이드", price: 1800 }
];

// API paths remain a separate contract: this function does not call the backend.
export async function getPreviewThemes(page: number, sort: string): Promise<{ success: true; data: ThemePage }> {
  if (!Number.isInteger(page) || page < 1 || !["name,asc", "price,asc", "price,desc"].includes(sort)) {
    throw new Error("올바르지 않은 테마 조회 조건입니다.");
  }
  const items = [...THEMES].sort((a, b) => {
    const value = sort.startsWith("price") ? a.price - b.price : a.name.localeCompare(b.name, "ko");
    return (sort.endsWith("desc") ? -value : value) || a.themeId.localeCompare(b.themeId);
  });
  const size = 6;
  return { success: true, data: { items: items.slice((page - 1) * size, page * size), page,
    size, totalElements: items.length, totalPages: Math.ceil(items.length / size) } };
}
