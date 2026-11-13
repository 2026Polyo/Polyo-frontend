import { useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Coins,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import ShopThemeCard from "../components/ShopThemeCard";
import ShopThemeDialog from "../components/ShopThemeDialog";
import ThemePreview from "../components/ThemePreview";
import type { ShopTheme } from "../features/shop";
import type { GameThemeId } from "../features/themes/gameThemes";
import { useShopCatalog, type ShopCatalogState } from "../hooks/useShopCatalog";
import type { ShopAccountState } from "../hooks/useShopAccount";
import "../styles/ShopScreen.css";

interface ShopCatalogProps {
  state: ShopCatalogState;
  onRetry: () => void;
  onOpenDetails: (theme: ShopTheme, trigger: HTMLButtonElement) => void;
}

function ShopCatalog({ state, onRetry, onOpenDetails }: ShopCatalogProps) {
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
  return (
    <div className="shop-grid">
      {state.data.items.map((theme) => (
        <ShopThemeCard
          key={theme.themeId}
          theme={theme}
          onOpenDetails={onOpenDetails}
        />
      ))}
    </div>
  );
}

export default function ShopScreen({
  wallet,
  onGoHome,
  onDevPreview,
}: {
  wallet: ShopAccountState;
  onGoHome: () => void;
  onDevPreview?: (themeId: GameThemeId) => void;
}) {
  const { catalog, page, sort, setPage, changeSort, retry } = useShopCatalog();
  const [selectedTheme, setSelectedTheme] = useState<ShopTheme | null>(null);
  const detailsTrigger = useRef<HTMLButtonElement | null>(null);
  const totalPages = catalog.status === "ready" ? catalog.data.totalPages : 0;

  function openDetails(theme: ShopTheme, trigger: HTMLButtonElement) {
    detailsTrigger.current = trigger;
    setSelectedTheme(theme);
  }

  function closeDetails() {
    setSelectedTheme(null);
    detailsTrigger.current?.focus();
  }

  return (
    <main className="shop-shell">
      <header className="shop-header">
        <button type="button" className="shop-back" onClick={onGoHome}>
          <ArrowLeft size={18} /> 게임으로
        </button>
        <span className="shop-brand">
          <ShoppingBag size={19} /> POLYOMINO <span>SHOP</span>
        </span>
        <div className="shop-wallet">
          <Coins size={20} />
          <span>
            보유 코인 <strong>{wallet.account?.coin.toLocaleString("ko-KR") ?? (wallet.pending ? "조회 중" : "—")}</strong>
          </span>
        </div>
      </header>
      <section className="shop-hero" aria-labelledby="shop-title">
        <div>
          <span className="shop-eyebrow">
            <Sparkles size={14} /> MAKE IT YOURS
          </span>
          <h1 id="shop-title">
            같은 퍼즐, <span>새로운 색깔.</span>
          </h1>
          <p>마음에 드는 블록으로 나만의 보드를 완성해 보세요.</p>
        </div>
        <div className="shop-hero-art">
          <ThemePreview themeId="theme_cat" />
        </div>
      </section>
      {wallet.error && !selectedTheme && (
        <div className="shop-status" role="alert">
          <p>{wallet.error}</p>
          <button type="button" onClick={() => void wallet.refresh()}>다시 조회</button>
        </div>
      )}
      <section aria-labelledby="shop-products-title">
        <div className="shop-toolbar">
          <div>
            <h2 id="shop-products-title">블록 테마</h2>
            <span>외형만 바뀌고, 게임 규칙은 그대로예요.</span>
          </div>
          <label>
            정렬{" "}
            <select
              value={sort}
              onChange={(event) => changeSort(event.target.value)}
            >
              <option value="name,asc">이름순</option>
              <option value="price,asc">낮은 가격순</option>
              <option value="price,desc">높은 가격순</option>
            </select>
          </label>
        </div>
        <div aria-live="polite" aria-busy={catalog.status === "loading"}>
          <ShopCatalog
            state={catalog}
            onRetry={retry}
            onOpenDetails={openDetails}
          />
        </div>
        {totalPages > 0 && (
          <nav className="shop-pagination" aria-label="상품 페이지">
            <button
              type="button"
              aria-label="이전 페이지"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span aria-current="page">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              aria-label="다음 페이지"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </nav>
        )}
      </section>
      <footer className="shop-footer">
        <ShoppingBag size={15} /> 나만의 색으로, 한 칸씩.
      </footer>
      <ShopThemeDialog
        theme={selectedTheme}
        wallet={wallet}
        onClose={closeDetails}
        onDevPreview={onDevPreview}
      />
    </main>
  );
}
