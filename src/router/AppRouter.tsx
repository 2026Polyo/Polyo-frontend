import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import type { MultiRouterProps } from "./MultiRouter";
import type { RankingRouterProps } from "./RankingRouter";
import type { ShopRouterProps } from "./ShopRouter";

const RankingRouter = lazy(() => import("./RankingRouter"));
const MultiRouter = lazy(() => import("./MultiRouter"));
const ShopRouter = lazy(() => import("./ShopRouter"));

interface AppRouterProps {
  ranking: RankingRouterProps;
  multi: MultiRouterProps;
  shop: ShopRouterProps;
  home: ReactNode;
}

export default function AppRouter({
  ranking,
  multi,
  shop,
  home,
}: AppRouterProps) {
  const location = useLocation();

  return (
    <Suspense fallback={null}>
      <div className="route-transition" key={location.pathname}>
        <Routes>
          <Route path="/ranking" element={<RankingRouter {...ranking} />} />
          <Route path="/multi" element={<MultiRouter {...multi} />} />
          <Route path="/shop" element={<ShopRouter {...shop} />} />
          <Route path="*" element={home} />
        </Routes>
      </div>
    </Suspense>
  );
}
