import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import type { RankingRouterProps } from "./RankingRouter";
import type { ShopRouterProps } from "./ShopRouter";

const RankingRouter = lazy(() => import("./RankingRouter"));
const ShopRouter = lazy(() => import("./ShopRouter"));

interface AppRouterProps {
  ranking: RankingRouterProps;
  shop: ShopRouterProps;
  home: ReactNode;
}

export default function AppRouter({ ranking, shop, home }: AppRouterProps) {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/ranking" element={<RankingRouter {...ranking} />} />
        <Route path="/shop" element={<ShopRouter {...shop} />} />
        <Route path="*" element={home} />
      </Routes>
    </Suspense>
  );
}
