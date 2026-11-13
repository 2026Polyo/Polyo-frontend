import { useEffect, useRef, useState } from "react";
import { creditApi, CreditApiError, type ShopAccount } from "../api/credit";

const SHOP_ERRORS: Record<string, string> = {
  SHOP_INSUFFICIENT_COIN: "코인이 부족합니다.",
  SHOP_THEME_NOT_OWNED: "보유한 테마만 장착할 수 있습니다.",
  SHOP_THEME_NOT_FOUND: "판매 중인 테마를 찾을 수 없습니다.",
};

export function useShopAccount(userId: string | undefined) {
  const [loaded, setLoaded] = useState<{ userId: string; data: ShopAccount } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const request = useRef(0);
  const busy = useRef(false);

  async function load(action: () => Promise<ShopAccount>, fallbackMessage: string) {
    if (!userId || busy.current) return false;
    busy.current = true;
    const current = ++request.current;
    setPending(true);
    setError(null);
    try {
      const data = await action();
      if (request.current !== current) return false;
      setLoaded({ userId, data });
      return true;
    } catch (failure) {
      if (request.current === current) {
        const message = failure instanceof CreditApiError ? SHOP_ERRORS[failure.code] : undefined;
        setError(message ?? fallbackMessage);
      }
      return false;
    } finally {
      if (request.current === current) {
        busy.current = false;
        setPending(false);
      }
    }
  }

  function refresh() {
    return load(creditApi.getShopAccount, "보유 코인과 테마를 불러오지 못했습니다.");
  }

  useEffect(() => {
    setLoaded(null);
    setError(null);
    setPending(false);
    void refresh();
    return () => {
      ++request.current;
      busy.current = false;
    };
  }, [userId]);

  return {
    account: loaded?.userId === userId ? loaded?.data ?? null : null,
    pending,
    error,
    refresh,
    grantLocalCoins: () => load(creditApi.grantLocalCoins, "개발용 코인을 지급하지 못했습니다."),
    purchase: (themeId: string) => load(() => creditApi.purchaseTheme(themeId), "구매 결과를 확인하지 못했습니다. 다시 시도해 주세요."),
    equip: (themeId: string) => load(() => creditApi.equipTheme(themeId), "테마를 장착하지 못했습니다. 다시 시도해 주세요."),
  };
}

export type ShopAccountState = ReturnType<typeof useShopAccount>;
