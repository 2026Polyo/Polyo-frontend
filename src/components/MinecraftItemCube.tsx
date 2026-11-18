import {
  getMinecraftMaterial,
  getMinecraftMaterialStyle,
} from "../features/themes/minecraftMaterials";

/** 여섯 텍스처 면을 가진 CSS 3D 큐브. 평면 아이콘을 회전시키지 않는다. */
export default function MinecraftItemCube({ color }: { color: string }) {
  return (
    <span
      className="mc-item-cube"
      data-mc-block={getMinecraftMaterial(color).id}
      style={getMinecraftMaterialStyle(color)}
    >
      <i className="mc-cube-front" />
      <i className="mc-cube-back" />
      <i className="mc-cube-right" />
      <i className="mc-cube-left" />
      <i className="mc-cube-top" />
      <i className="mc-cube-bottom" />
    </span>
  );
}
