import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ShoppingBag, Coins, Sparkles, ChevronLeft, ChevronRight, X, LockKeyhole } from "lucide-react";
import ThemePreview from "../components/ThemePreview";
import { getPreviewThemes, getThemePresentation, type ThemePage, type ShopTheme } from "../features/shop";
import "../styles/ShopScreen.css";

export default function ShopScreen({ onGoHome }: { onGoHome: () => void }) {
  const [data, setData] = useState<ThemePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState("name,asc");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<ShopTheme | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    getPreviewThemes(page, sort).then((response) => {
      if (active) setData(response.data);
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, sort, retry]);

  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);

  function closeDetails() { dialog.current?.close(); }

  return <main className="shop-shell">
    <header className="shop-header">
      <button type="button" className="shop-back" onClick={onGoHome}><ArrowLeft size={18} /> 게임으로</button>
      <span className="shop-brand"><ShoppingBag size={19} /> POLYOMINO <span>SHOP</span></span>
      <div className="shop-wallet"><Coins size={20} /><span>보유 코인 <strong>로그인 필요</strong></span></div>
    </header>
    <section className="shop-hero" aria-labelledby="shop-title">
      <div><span className="shop-eyebrow"><Sparkles size={14} /> MAKE IT YOURS</span>
        <h1 id="shop-title">같은 퍼즐, <span>새로운 색깔.</span></h1>
        <p>마음에 드는 블록으로 나만의 보드를 완성해 보세요.</p></div>
      <div className="shop-hero-art"><ThemePreview themeId="theme_classic" /></div>
    </section>
    <p className="shop-demo-note"><LockKeyhole size={15} /> 상점 미리보기 · 예시 상품과 가격입니다. 로그인과 실제 구매는 서버 연동 후 제공됩니다.</p>
    <section aria-labelledby="shop-products-title">
      <div className="shop-toolbar"><div><h2 id="shop-products-title">블록 테마</h2><span>외형만 바뀌고, 게임 규칙은 그대로예요.</span></div>
        <label>정렬 <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
          <option value="name,asc">이름순</option><option value="price,asc">낮은 가격순</option><option value="price,desc">높은 가격순</option>
        </select></label></div>
      <div aria-live="polite" aria-busy={loading}>
        {loading ? <p className="shop-status" role="status">상품을 불러오고 있어요…</p> : error ?
          <div className="shop-status" role="alert"><p>상품을 불러오지 못했어요.</p><button type="button" onClick={() => setRetry((value) => value + 1)}>다시 시도</button></div> :
          !data?.items.length ? <p className="shop-status">아직 등록된 상품이 없어요.</p> :
          <div className="shop-grid">{data.items.map((product) => <article className="shop-card" key={product.themeId}>
            <button className="shop-card-preview" type="button" aria-label={`${product.name} 미리보기`} onClick={(event) => { opener.current = event.currentTarget; setSelected(product); }}><ThemePreview themeId={product.themeId} /><span>미리보기 ↗</span></button>
            <div className="shop-card-body"><span className="shop-category">BLOCK THEME</span><h3>{product.name}</h3><p>{getThemePresentation(product.themeId).description}</p>
              <div className="shop-card-footer"><strong><Coins size={17} /> {product.price.toLocaleString("ko-KR")} 코인</strong>
                <button type="button" onClick={(event) => { opener.current = event.currentTarget; setSelected(product); }}>자세히 보기</button></div></div>
          </article>)}</div>}
      </div>
      {!loading && !error && data && data.totalPages > 0 && <nav className="shop-pagination" aria-label="상품 페이지">
        <button type="button" aria-label="이전 페이지" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /></button>
        <span aria-current="page">{page} / {data.totalPages}</span>
        <button type="button" aria-label="다음 페이지" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={18} /></button>
      </nav>}
    </section>
    <footer className="shop-footer"><ShoppingBag size={15} /> 나만의 색으로, 한 칸씩.</footer>
    <dialog ref={dialog} className="shop-dialog" aria-labelledby="shop-detail-title" onClose={() => { setSelected(null); opener.current?.focus(); }} onClick={(event) => { if (event.target === event.currentTarget) closeDetails(); }}>
      {selected && <><button type="button" className="shop-dialog-close" aria-label="상세 닫기" onClick={closeDetails}><X size={21} /></button>
        <ThemePreview themeId={selected.themeId} /><div className="shop-detail-body"><span className="shop-category">BLOCK THEME</span><h2 id="shop-detail-title">{selected.name}</h2><p>{getThemePresentation(selected.themeId).description}</p>
          <strong className="shop-detail-price"><Coins size={21} /> {selected.price.toLocaleString("ko-KR")} 코인</strong>
          <button className="shop-purchase" type="button" disabled>서버 연동 후 구매 가능</button>
          <small>현재는 미리보기 화면입니다. 구매와 테마 적용은 아직 제공되지 않습니다.</small></div></>}
    </dialog>
  </main>;
}
