import { useEffect, useState } from "react";
import { getPreviewThemes, type ThemePage } from "../features/shop";

export type ShopCatalogState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: ThemePage };

export function useShopCatalog() {
  const [catalog, setCatalog] = useState<ShopCatalogState>({
    status: "loading",
  });
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("name,asc");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setCatalog({ status: "loading" });

    getPreviewThemes(page, sort)
      .then(({ data }) => {
        if (active) setCatalog({ status: "ready", data });
      })
      .catch(() => {
        if (active) setCatalog({ status: "error" });
      });

    // 이전 조회 결과가 최신 정렬·페이지 결과를 덮어쓰지 않도록 한다.
    return () => {
      active = false;
    };
  }, [page, sort, retryCount]);

  function changeSort(nextSort: string) {
    setSort(nextSort);
    setPage(1);
  }

  return {
    catalog,
    page,
    sort,
    setPage,
    changeSort,
    retry: () => setRetryCount((count) => count + 1),
  };
}
