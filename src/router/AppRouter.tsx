import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import RankingRouter, { type RankingRouterProps } from "./RankingRouter";
import ShopRouter, { type ShopRouterProps } from "./ShopRouter";

interface AppRouterProps {
  ranking: RankingRouterProps;
  shop: ShopRouterProps;
  home: ReactNode;
}

export default function AppRouter({ ranking, shop, home }: AppRouterProps) {
  return (
    <Routes>
      <Route path="/ranking" element={<RankingRouter {...ranking} />} />
      <Route path="/shop" element={<ShopRouter {...shop} />} />
      <Route path="*" element={home} />
    </Routes>
  );
}
