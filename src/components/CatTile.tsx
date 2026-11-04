import "../styles/CatTheme.css";

/** Keep mounted on empty board cells so filling, joining and reopening edges can transition. */
export default function CatTile({
  joined = "",
  filled = true,
}: {
  joined?: string;
  filled?: boolean;
}) {
  return (
    <span
      className="cat-tile-face"
      data-joined={joined}
      data-filled={filled}
      aria-hidden="true"
    />
  );
}
