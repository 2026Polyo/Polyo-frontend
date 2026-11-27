import { useEffect, useState } from "react";
import { creditApi } from "../../api";
import type { ThemePage } from "../../features/shop";

export type ShopCatalogState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      data: ThemePage;
      refreshing: boolean;
      refreshError: boolean;
    };

export function useShopCatalog() {
  const [catalog, setCatalog] = useState<ShopCatalogState>({
    status: "loading",
  });
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("name,asc");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    // Retain the last successful page until a replacement is fully available.
    setCatalog((current) =>
      current.status === "ready"
        ? { ...current, refreshing: true, refreshError: false }
        : { status: "loading" },
    );

    creditApi
      .getShopThemes(page, sort)
      .then((data) => {
        if (active)
          setCatalog({
            status: "ready",
            data,
            refreshing: false,
            refreshError: false,
          });
      })
      .catch(() => {
        if (active)
          setCatalog((current) =>
            current.status === "ready"
              ? { ...current, refreshing: false, refreshError: true }
              : { status: "error" },
          );
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

  function changePage(nextPage: number) {
    // A failed request can leave the displayed page different from the requested page.
    if (nextPage === page) setRetryCount((count) => count + 1);
    else setPage(nextPage);
  }

  return {
    catalog,
    page,
    sort,
    setPage: changePage,
    changeSort,
    retry: () => setRetryCount((count) => count + 1),
  };
}
