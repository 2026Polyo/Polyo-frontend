import { useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Coins,
  LockKeyhole,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import ShopThemeCard from "../components/ShopThemeCard";
import ShopThemeDialog from "../components/ShopThemeDialog";
import ThemePreview from "../components/ThemePreview";
import type { ShopTheme } from "../features/shop";
import { useShopCatalog, type ShopCatalogState } from "../hooks/useShopCatalog";
import "../styles/ShopScreen.css";

interface ShopCatalogProps {
  state: ShopCatalogState;
  onRetry: () => void;
  onPreview: (theme: ShopTheme, trigger: HTMLButtonElement) => void;
}

function ShopCatalog({ state, onRetry, onPreview }: ShopCatalogProps) {
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
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}

export default function ShopScreen({ onGoHome }: { onGoHome: () => void }) {
  const { catalog, page, sort, setPage, changeSort, retry } = useShopCatalog();
  const [selectedTheme, setSelectedTheme] = useState<ShopTheme | null>(null);
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const totalPages = catalog.status === "ready" ? catalog.data.totalPages : 0;

  function openPreview(theme: ShopTheme, trigger: HTMLButtonElement) {
    previewTrigger.current = trigger;
    setSelectedTheme(theme);
  }

  function closePreview() {
    setSelectedTheme(null);
    previewTrigger.current?.focus();
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
            보유 코인 <strong>로그인 필요</strong>
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
          <ThemePreview themeId="theme_classic" />
        </div>
      </section>
      <p className="shop-demo-note">
        <LockKeyhole size={15} /> 상점 미리보기 · 예시 상품과 가격입니다.
        로그인과 실제 구매는 서버 연동 후 제공됩니다.
      </p>
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
            onPreview={openPreview}
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
      <ShopThemeDialog theme={selectedTheme} onClose={closePreview} />
    </main>
  );
}
