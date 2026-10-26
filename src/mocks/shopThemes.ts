import type { ShopTheme } from "../features/shop";

// 화면 개발용 데이터. 실제 API와 연결할 때 이 데이터 공급자만 교체한다.
export const MOCK_SHOP_THEMES: ShopTheme[] = [
  { themeId: "theme_classic", name: "클래식 블록", price: 500 },
  { themeId: "theme_neon", name: "네온 나이트", price: 1200 },
  { themeId: "theme_pastel", name: "파스텔 드림", price: 1000 },
  { themeId: "theme_sunset", name: "선셋 글로우", price: 1500 },
  { themeId: "theme_ocean", name: "오션 브리즈", price: 1200 },
  { themeId: "theme_arcade", name: "레트로 아케이드", price: 1800 },
];
