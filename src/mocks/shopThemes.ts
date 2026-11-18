import type { ShopTheme } from "../features/shop";

// 화면 개발용 데이터. 실제 API와 연결할 때 이 데이터 공급자만 교체한다.
export const MOCK_SHOP_THEMES: ShopTheme[] = [
  { themeId: "theme_neon", name: "네온 나이트", price: 500 },
  { themeId: "theme_jelly", name: "젤리 팝", price: 300 },
  { themeId: "theme_minecraft", name: "마인크래프트", price: 750 },
  { themeId: "theme_cat", name: "고양이 드림", price: 750 },
];
