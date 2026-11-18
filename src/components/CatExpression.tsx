import type { CatExpression } from "../features/themes/catRegions";

/** Original vector expressions inspired by the reference moods, without embedding the supplied drawings. */
export default function CatExpression({
  expression,
}: {
  expression: CatExpression;
}) {
  const bigEyes = expression === "teary" || expression === "sparkle";
  return (
    <svg
      className="cat-expression"
      data-expression={expression}
      viewBox="0 0 100 80"
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="var(--cat-stripes, #d5cfd9)"
        strokeWidth="5"
        strokeLinecap="round"
      >
        <path d="M42 5l-2 9M51 4v10M60 5l2 9" />
      </g>
      <g
        fill="var(--cat-ink, #39323f)"
        stroke="var(--cat-ink, #39323f)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {expression === "wonder" ? (
          <>
            <ellipse
              cx="25"
              cy="34"
              rx="17"
              ry="20"
              transform="rotate(-12 25 34)"
            />
            <ellipse
              cx="75"
              cy="34"
              rx="17"
              ry="20"
              transform="rotate(12 75 34)"
            />
            <g fill="var(--cat-shine, #fff)" stroke="none">
              <ellipse cx="20" cy="24" rx="9" ry="10" />
              <ellipse cx="70" cy="24" rx="9" ry="10" />
              <circle cx="31" cy="44" r="3" />
              <circle cx="81" cy="44" r="3" />
            </g>
          </>
        ) : bigEyes ? (
          <>
            <ellipse cx="25" cy="35" rx="12" ry="14" />
            <ellipse cx="75" cy="35" rx="12" ry="14" />
            <g fill="var(--cat-shine, #fff)" stroke="none">
              <ellipse cx="21" cy="29" rx="4.5" ry="6" />
              <ellipse cx="71" cy="29" rx="4.5" ry="6" />
              <circle cx="30" cy="41" r="3" />
              <circle cx="80" cy="41" r="3" />
            </g>
          </>
        ) : expression === "sleepy" ? (
          <g fill="none">
            <path d="M17 33q8 7 16 0M67 33q8 7 16 0" />
          </g>
        ) : (
          <>
            <ellipse cx="25" cy="34" rx="3.5" ry="3" />
            <ellipse cx="75" cy="34" rx="3.5" ry="3" />
          </>
        )}
        {expression === "dazed" && (
          <path d="M37 42q2 9 12 4q6 8 14 0" fill="none" />
        )}
        {expression === "sleepy" && <path d="M46 44q-10 14 5 18q12-8 3-18z" />}
        {expression === "playful" && (
          <>
            <path d="M40 43h22q-1 20-16 17q-9-3-6-17z" />
            <path d="M47 52q5-5 10 0q-4 8-10 4z" fill="#f3a9c2" stroke="none" />
          </>
        )}
        {expression === "teary" && (
          <path d="M41 56l5-4l5 4l5-4l5 4" fill="none" />
        )}
        {expression === "sparkle" && <path d="M40 55h20" fill="none" />}
        {expression === "wonder" && <path d="M45 61q5 5 10 0" fill="none" />}
        {expression === "happy" && (
          <>
            <path d="M32 40h36q-1 25-18 25q-18 0-18-25z" fill="#f4a7c6" />
            <path
              d="M50 45l3 10"
              fill="none"
              stroke="#e4699e"
              strokeWidth="6"
            />
            <path d="M26 40h48" fill="none" />
          </>
        )}
        {expression === "grin" && (
          <>
            <path d="M17 42q33 14 66 0q-4 27-33 27q-29 0-33-27z" fill="#fff" />
            <path d="M31 47v16M44 51v17M57 51v17M70 47v16" fill="none" stroke="#39323f" />
          </>
        )}
      </g>
      <g fill="#f4b6cf">
        <ellipse cx="12" cy="48" rx="6" ry="3" />
        <ellipse cx="88" cy="48" rx="6" ry="3" />
      </g>
      {(expression === "dazed" || expression === "sleepy") && (
        <path
          d="M57 56v13q0 5 3 5"
          fill="none"
          stroke="#a9dfe9"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}
      {expression === "teary" && (
        <g fill="#b6ddeb">
          <path d="M16 49l-3 10q5 5 8 0z" />
          <path d="M80 49l-3 10q5 5 8 0z" />
        </g>
      )}
      {expression === "sleepy" && (
        <path
          d="M79 8h10l-10 10h10"
          fill="none"
          stroke="#a8b5d0"
          strokeWidth="3"
        />
      )}
    </svg>
  );
}
