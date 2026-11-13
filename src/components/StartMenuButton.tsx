import type { ReactNode } from "react";

interface StartMenuButtonProps {
  id?: string;
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
}

function StartMenuButton({
  id,
  icon,
  children,
  onClick,
}: StartMenuButtonProps) {
  return (
    <button
      className="start-menu-action"
      id={id}
      onClick={onClick}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

export default StartMenuButton;
