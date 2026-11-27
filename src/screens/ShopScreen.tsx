import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Coins } from "lucide-react";
import MenuBlock from "../components/MenuBlock";
import {
  ShopSortMenu,
  ShopThemeCard,
  ShopThemeDialog,
} from "../components/shop";
import type { ShopTheme } from "../features/shop";
import type { GameThemeId } from "../features/themes";
import {
  useShopCatalog,
  type ShopAccountState,
  type ShopCatalogState,
} from "../hooks/shop";
import { ShopCatalogNotice } from "../styles/shop/ShopCatalogNotice.styles";

interface ShopCatalogProps {
  state: ShopCatalogState;
  wallet: ShopAccountState;
  onRetry: () => void;
  onOpenDetails: (theme: ShopTheme, trigger: HTMLButtonElement) => void;
}

function ShopCatalog({
  state,
  wallet,
  onRetry,
  onOpenDetails,
}: ShopCatalogProps) {
  if (state.status === "loading") {
    return (
      <p className="shop-status" role="status">
        상품을 불러오고 있어요…
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <div className="shop-status" role="alert">
        <p>상품을 불러오지 못했어요.</p>
        <button type="button" onClick={onRetry}>
          다시 시도
        </button>
      </div>
    );
  }
  if (state.data.items.length === 0) {
    return <p className="shop-status">아직 등록된 상품이 없어요.</p>;
  }
  const renderCard = (theme: ShopTheme) => (
    <ShopThemeCard
      key={theme.themeId}
      theme={theme}
      wallet={wallet}
      onOpenDetails={onOpenDetails}
    />
  );
  if (!wallet.account) {
    return <div className="shop-grid">{state.data.items.map(renderCard)}</div>;
  }

  const ownedIds = new Set([
    ...wallet.account.ownedThemeIds,
    wallet.account.equippedThemeId,
  ]);
  const owned = state.data.items.filter(({ themeId }) => ownedIds.has(themeId));
  const unowned = state.data.items.filter(
    ({ themeId }) => !ownedIds.has(themeId),
  );
  const groups = [
    { id: "owned", title: "보유 테마", themes: owned },
    { id: "unowned", title: "미보유 테마", themes: unowned },
  ];

  // Keep cards under the same parent when a purchase moves them between groups.
  return (
    <div className="shop-grid">
      {groups.flatMap(({ id, title, themes }) =>
        themes.length
          ? [
              <h3 className="shop-group-heading" key={`heading-${id}`}>
                {title}
              </h3>,
              ...themes.map(renderCard),
            ]
          : [],
      )}
    </div>
  );
}

export default function ShopScreen({
  themeId,
  wallet,
  onGoHome,
  onDevPreview,
}: {
  themeId: GameThemeId;
  wallet: ShopAccountState;
  onGoHome: () => void;
  onDevPreview?: (themeId: GameThemeId) => void;
}) {
  const { catalog, page, sort, setPage, changeSort, retry } = useShopCatalog();
  const [selectedTheme, setSelectedTheme] = useState<ShopTheme | null>(null);
  const detailsTrigger = useRef<HTMLButtonElement | null>(null);
  const totalPages = catalog.status === "ready" ? catalog.data.totalPages : 0;
  const visiblePage = catalog.status === "ready" ? catalog.data.page : page;
  const pending =
    catalog.status === "loading" ||
    (catalog.status === "ready" && catalog.refreshing);

  function openDetails(theme: ShopTheme, trigger: HTMLButtonElement) {
    detailsTrigger.current = trigger;
    setSelectedTheme(theme);
  }

  function closeDetails() {
    setSelectedTheme(null);
    detailsTrigger.current?.focus();
  }

  return (
    <main className="shop-shell menu-scene" data-game-theme={themeId}>
      <div className="shop-stage">
        <header className="shop-header">
          <button type="button" className="shop-back" onClick={onGoHome}>
            <ArrowLeft size={18} /> 게임으로
          </button>
          <div className="shop-wallet">
            <Coins size={20} />
            <span>
              보유 코인{" "}
              <strong>
                {wallet.account?.coin.toLocaleString("ko-KR") ??
                  (wallet.pending ? "조회 중" : "—")}
              </strong>
            </span>
          </div>
        </header>
        <div className="shop-heading">
          <MenuBlock color="yellow" />
          <h1 id="shop-title">상점</h1>
          <MenuBlock color="purple" />
        </div>
        <section
          className="shop-products"
          aria-labelledby="shop-products-title"
        >
          {wallet.error && !selectedTheme && (
            <div className="shop-status" role="alert">
              <p>{wallet.error}</p>
              <button type="button" onClick={() => void wallet.refresh()}>
                다시 조회
              </button>
            </div>
          )}
          <div className="shop-toolbar">
            <h2 id="shop-products-title">블록 테마</h2>
            <ShopSortMenu value={sort} onChange={changeSort} />
          </div>
          <div aria-live="polite" aria-busy={pending}>
            <ShopCatalog
              state={catalog}
              wallet={wallet}
              onRetry={retry}
              onOpenDetails={openDetails}
            />
          </div>
          {totalPages > 1 && (
            <nav className="shop-pagination" aria-label="상품 페이지">
              <button
                type="button"
                aria-label="이전 페이지"
                disabled={pending || visiblePage <= 1}
                onClick={() => setPage(visiblePage - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              <span aria-current="page">
                {visiblePage} / {totalPages}
              </span>
              <button
                type="button"
                aria-label="다음 페이지"
                disabled={pending || visiblePage >= totalPages}
                onClick={() => setPage(visiblePage + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </nav>
          )}
        </section>
      </div>
      <ShopThemeDialog
        theme={selectedTheme}
        wallet={wallet}
        onClose={closeDetails}
        onDevPreview={onDevPreview}
      />
      {catalog.status === "ready" &&
        catalog.refreshError &&
        createPortal(
          <ShopCatalogNotice role="alert">
            <span>목록을 새로 불러오지 못했어요.</span>
            <button type="button" onClick={retry}>
              다시 시도
            </button>
          </ShopCatalogNotice>,
          document.body,
        )}
    </main>
  );
}
