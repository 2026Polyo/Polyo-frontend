import { Check } from "lucide-react";

interface RoomOptionProps {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  detail?: string;
  mobileDetail?: string;
}

function RoomOption({ name, value, label, checked, onChange, detail, mobileDetail }: RoomOptionProps) {
  return (
    <label className={`room-option${detail ? " room-option-detailed" : ""}`}>
      <input checked={checked} name={name} onChange={onChange} type="radio" value={value} />
      <span className="room-option-surface">
        <span className="room-option-copy">
          <span className="room-option-label">{label}</span>
          {detail && (
            <span className="room-option-detail">
              <span className={mobileDetail ? "room-desktop-copy" : undefined}>{detail}</span>
              {mobileDetail && <span className="room-mobile-copy">{mobileDetail}</span>}
            </span>
          )}
        </span>
        {checked && <Check aria-hidden="true" className="room-option-check" size={20} />}
      </span>
    </label>
  );
}

export default RoomOption;
