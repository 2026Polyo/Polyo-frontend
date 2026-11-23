import ShopScreen from "../screens/ShopScreen";
import type { GameThemeId } from "../features/themes";
import type { ShopAccountState } from "../hooks/shop";

export interface ShopRouterProps {
  themeId: GameThemeId;
  wallet: ShopAccountState;
  onGoHome: () => void;
  onDevPreview?: (themeId: GameThemeId) => void;
}

export default function ShopRouter({
  themeId,
  wallet,
  onGoHome,
  onDevPreview,
}: ShopRouterProps) {
  return (
    <ShopScreen
      themeId={themeId}
      wallet={wallet}
      onGoHome={onGoHome}
      onDevPreview={onDevPreview}
    />
  );
}
