export default function MenuBlock({
  color,
  className = "",
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      className={`start-piece start-piece-${color} ${className}`}
      aria-hidden="true"
    >
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
