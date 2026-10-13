import { Home, LogOut, Settings } from "lucide-react";

interface GameSettingsMenuProps {
  open: boolean;
  onClose: () => void;
  onGoHome: () => void;
  onQuit: () => void;
  onToggle: () => void;
}

function GameSettingsMenu({
  open,
  onClose,
  onGoHome,
  onQuit,
  onToggle
}: GameSettingsMenuProps) {
  return (
    <>
      <div className="game-settings">
        <button
          aria-expanded={open}
          aria-label="설정"
          className="game-settings-button"
          onClick={onToggle}
          type="button"
        >
          <Settings size={22} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div
          className="game-settings-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          onClick={onClose}
        >
          <section className="game-settings-menu" onClick={(event) => event.stopPropagation()}>
            <strong id="settings-title" className="game-settings-title">설정</strong>
            <button className="game-settings-menu-button" onClick={onQuit} type="button">
              <LogOut size={18} aria-hidden="true" />
              <span>그만하기</span>
            </button>
            <button className="game-settings-menu-button" onClick={onGoHome} type="button">
              <Home size={18} aria-hidden="true" />
              <span>홈</span>
            </button>
          </section>
        </div>
      )}
    </>
  );
}

export default GameSettingsMenu;
