import type { InputHTMLAttributes, Ref } from "react";

interface RoomTextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint: string;
  error?: string;
  counter?: string;
  inputRef?: Ref<HTMLInputElement>;
  mobileHint?: string;
}

function RoomTextField({ id, label, hint, error, counter, inputRef, mobileHint, ...inputProps }: RoomTextFieldProps) {
  return (
    <div className={`room-field${error ? " room-field-error" : ""}`}>
      <div className="room-field-label">
        <label htmlFor={id}>{label}</label>
        {counter !== undefined && <span className="room-field-counter">{counter}</span>}
      </div>
      <input
        {...inputProps}
        aria-describedby={`${id}-hint`}
        aria-invalid={Boolean(error)}
        className="room-input"
        id={id}
        ref={inputRef}
      />
      <p className="room-field-hint" id={`${id}-hint`}>
        {error ?? (mobileHint ? <><span className="room-desktop-copy">{hint}</span><span className="room-mobile-copy">{mobileHint}</span></> : hint)}
      </p>
    </div>
  );
}

export default RoomTextField;
