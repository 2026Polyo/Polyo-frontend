import { useEffect, useMemo, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { PIECE_COLORS, PIECES, getPieceTemplate } from "../mocks/gameData";
import { profileApi, type AuthUser, type Profile } from "../api";
import { PieceShape } from "./piece";
import { createPieceInstance } from "../utils/pieceUtils";
import "../styles/ProfileModal.css";

interface Props {
  user: AuthUser;
  profileUserId?: string;
  readOnly?: boolean;
  baseLoadout?: string[];
  loadoutIds?: string[];
  onClose: () => void;
  onUserChange?: (user: AuthUser) => void;
}
const DEFAULT: Profile = {
  userId: "",
  loginId: "",
  nickname: "",
  normalBestScore: 0,
  hardBestScore: 0,
  trophyCount: 0,
  equippedBaseBlocks: [],
  equippedSpecialBlocks: [],
  avatarBlockId: "tetromino-t-down",
  avatarBlockColor: "cyan",
  avatarBackgroundColor: "#d9f4ff",
};
const AVATAR_BACKGROUNDS = [
  "#d9f4ff",
  "#ffe3ed",
  "#fff1b8",
  "#e3f6c8",
  "#e8ddff",
  "#d9e8ff",
];

function ProfileModal({
  user,
  profileUserId,
  readOnly = false,
  baseLoadout = [],
  loadoutIds = [],
  onClose,
  onUserChange,
}: Props) {
  const [profile, setProfile] = useState(DEFAULT);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(user.nickname);
  const [blockId, setBlockId] = useState(DEFAULT.avatarBlockId);
  const [blockColor, setBlockColor] = useState(DEFAULT.avatarBlockColor);
  const [background, setBackground] = useState(DEFAULT.avatarBackgroundColor);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const currentBase = useMemo(
    () => (baseLoadout.length ? baseLoadout : profile.equippedBaseBlocks),
    [baseLoadout, profile.equippedBaseBlocks],
  );
  const currentSpecial = useMemo(
    () => (loadoutIds.length ? loadoutIds : profile.equippedSpecialBlocks),
    [loadoutIds, profile.equippedSpecialBlocks],
  );
  const avatar = getPieceTemplate(blockId) ?? PIECES[0];
  const deckPieces = useMemo(
    () =>
      [...currentBase, ...currentSpecial]
        .map((id, index) => {
          const piece = getPieceTemplate(id);
          return piece
            ? createPieceInstance({
                ...piece,
                color: PIECE_COLORS[index % PIECE_COLORS.length],
              })
            : null;
        })
        .filter((piece): piece is NonNullable<typeof piece> => piece !== null),
    [currentBase, currentSpecial],
  );
  useEffect(() => {
    void (profileUserId ? profileApi.getById(profileUserId) : profileApi.get())
      .then((data) => {
        setProfile(data);
        setNickname(data.nickname);
        setBlockId(data.avatarBlockId);
        setBlockColor(data.avatarBlockColor);
        setBackground(data.avatarBackgroundColor);
      })
      .catch((failure: unknown) =>
        setError(
          failure instanceof Error
            ? failure.message
            : "프로필을 불러오지 못했습니다.",
        ),
      );
  }, [profileUserId]);
  async function save() {
    setSaving(true);
    setError(null);
    try {
      const next = await profileApi.update({
        nickname: nickname.trim(),
        avatarBlockId: blockId,
        avatarBlockColor: blockColor,
        avatarBackgroundColor: background,
        equippedBaseBlocks: currentBase,
        equippedSpecialBlocks: currentSpecial,
      });
      setProfile(next);
      setEditing(false);
      onUserChange?.({ ...user, nickname: next.nickname });
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "프로필을 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div
      className="profile-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-title"
      onClick={onClose}
    >
      <section
        className="profile-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="profile-close"
          aria-label="닫기"
          onClick={onClose}
          type="button"
        >
          <X />
        </button>
        <div className="profile-panel-heading">
          <span>MY PAGE</span>
          <h2 id="profile-title">내 프로필</h2>
        </div>
        <div className="profile-hero">
          <div className="profile-avatar" style={{ background }}>
            <PieceShape
              piece={createPieceInstance({ ...avatar, color: blockColor })}
              cellSize={10}
              cellGap={1}
            />
          </div>
          <div>
            <h3>{profile.nickname || user.nickname}</h3>
            <p>@{profile.loginId || user.loginId}</p>
          </div>
          {!readOnly && (
            <button
              className="profile-edit-button"
              onClick={() => setEditing((value) => !value)}
              type="button"
            >
              <Pencil size={16} /> 프로필 수정
            </button>
          )}
        </div>
        {!readOnly && editing && (
          <div className="profile-editor">
            <label>
              닉네임
              <input
                value={nickname}
                maxLength={20}
                onChange={(event) => setNickname(event.target.value)}
              />
            </label>
            <div className="profile-block-picker-label">아바타 블록</div>
            <div className="profile-block-picker">
              {PIECES.map((piece) => (
                <button
                  aria-label={piece.id}
                  className={`profile-block-option ${blockId === piece.id ? "selected" : ""}`}
                  key={piece.id}
                  onClick={() => setBlockId(piece.id)}
                  type="button"
                >
                  <PieceShape
                    piece={createPieceInstance({ ...piece, color: blockColor })}
                    cellSize={7}
                    cellGap={1}
                  />
                </button>
              ))}
            </div>
            <div className="profile-color-row">
              <label>
                블록 색상
                <div className="profile-swatches">
                  {PIECE_COLORS.map((color) => (
                    <button
                      aria-label={color}
                      className={`profile-swatch piece-${color} ${blockColor === color ? "selected" : ""}`}
                      key={color}
                      onClick={() => setBlockColor(color)}
                      type="button"
                    />
                  ))}
                </div>
              </label>
              <label>
                배경 색상
                <div className="profile-background-swatches">
                  {AVATAR_BACKGROUNDS.map((color) => (
                    <button
                      aria-label={color}
                      className={`profile-background-swatch ${background === color ? "selected" : ""}`}
                      key={color}
                      style={{ background: color }}
                      onClick={() => setBackground(color)}
                      type="button"
                    />
                  ))}
                </div>
              </label>
            </div>
            <button
              className="profile-save"
              disabled={saving || nickname.trim().length < 2}
              onClick={() => void save()}
              type="button"
            >
              <Save size={17} />
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        )}
        {error && (
          <p className="profile-error" role="alert">
            {error}
          </p>
        )}
        <div className="profile-stats">
          <div>
            <strong>{profile.normalBestScore.toLocaleString()}</strong>
            <span>일반 최고점수</span>
          </div>
          <div>
            <strong>{profile.hardBestScore.toLocaleString()}</strong>
            <span>하드 최고점수</span>
          </div>
          <div>
            <strong>{profile.trophyCount}</strong>
            <span>트로피</span>
          </div>
        </div>
        <div className="profile-deck">
          <h3>현재 덱에 설정한 블록</h3>
          <div className="profile-deck-grid">
            {deckPieces.map((piece, index) => (
              <div key={`${piece.id}-${index}`}>
                <PieceShape piece={piece} cellSize={13} cellGap={1} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
export default ProfileModal;
