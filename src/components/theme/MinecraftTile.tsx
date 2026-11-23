import {
  getMinecraftMaterial,
  getMinecraftMaterialStyle,
} from "../../features/themes";

export default function MinecraftTile({
  color,
  className = "",
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      className={`mc-tile-face ${className}`}
      data-mc-block={getMinecraftMaterial(color).id}
      style={getMinecraftMaterialStyle(color)}
      aria-hidden="true"
    />
  );
}
