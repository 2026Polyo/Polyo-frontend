import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthUser } from "../api";
import ProfileModal from "../components/ProfileModal";
import { RankingScreen } from "../screens/ranking";
import { ThemeScope } from "../components/theme";
import type { GameThemeId } from "../features/themes";

export interface RankingRouterProps {
  currentUserId: string;
  themeId: GameThemeId;
  user: AuthUser;
  onUserChange: (user: AuthUser) => void;
}

export default function RankingRouter({
  currentUserId,
  themeId,
  user,
  onUserChange,
}: RankingRouterProps) {
  const navigate = useNavigate();
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  return (
    <ThemeScope themeId={themeId}>
      <RankingScreen
        currentUserId={currentUserId}
        themeId={themeId}
        onBack={() => navigate("/")}
        onSelectProfile={setProfileUserId}
      />
      {profileUserId && (
        <ProfileModal
          user={{ id: profileUserId, loginId: "", nickname: "" }}
          profileUserId={profileUserId}
          readOnly={profileUserId !== user.id}
          onClose={() => setProfileUserId(null)}
          onUserChange={profileUserId === user.id ? onUserChange : undefined}
        />
      )}
    </ThemeScope>
  );
}
