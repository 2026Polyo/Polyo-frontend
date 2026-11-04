import { MOCK_SHOP_THEMES } from "../mocks/shopThemes";

/** THEME의 조회 DTO. DB ID 타입은 실제 API 연결 시 변환한다. */
export interface ShopTheme {
  themeId: string;
  name: string;
  price: number;
}

export interface ThemePage {
  items: ShopTheme[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const PREVIEW_PAGE_SIZE = 6;
const SUPPORTED_SORTS = ["name,asc", "price,asc", "price,desc"];

function compareThemes(
  left: ShopTheme,
  right: ShopTheme,
  sort: string,
): number {
  const comparison = sort.startsWith("price")
    ? left.price - right.price
    : left.name.localeCompare(right.name, "ko");
  const direction = sort.endsWith("desc") ? -1 : 1;

  return comparison * direction || left.themeId.localeCompare(right.themeId);
}

/** API 응답 형태를 유지하는 임시 공급자. 서버나 사용자 계정에는 접근하지 않는다. */
export async function getPreviewThemes(
  page: number,
  sort: string,
): Promise<{ success: true; data: ThemePage }> {
  if (!Number.isInteger(page) || page < 1 || !SUPPORTED_SORTS.includes(sort)) {
    throw new Error("올바르지 않은 테마 조회 조건입니다.");
  }

  const themes = [...MOCK_SHOP_THEMES].sort((left, right) =>
    compareThemes(left, right, sort),
  );
  const offset = (page - 1) * PREVIEW_PAGE_SIZE;

  return {
    success: true,
    data: {
      items: themes.slice(offset, offset + PREVIEW_PAGE_SIZE),
      page,
      size: PREVIEW_PAGE_SIZE,
      totalElements: themes.length,
      totalPages: Math.ceil(themes.length / PREVIEW_PAGE_SIZE),
    },
  };
}
