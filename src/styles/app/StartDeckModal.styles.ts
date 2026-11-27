import styled from "@emotion/styled";

export const DeckBuilderBackdrop = styled.div`
  && {
    position: fixed;
    inset: 0;
    z-index: 85;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    place-items: center;
    padding: 24px;
    background: #09264d73;
    backdrop-filter: blur(4px);
    color: var(--menu-ink);
  }

  .deck-panel.deck-builder {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 18px;
    width: min(100%, 880px);
    min-width: 0;
    max-height: calc(100dvh - 48px);
    overflow: hidden;
    padding: 24px;
    color: var(--menu-ink);
    background: var(--menu-paper);
    border: 2px solid white;
    border-radius: 28px;
    box-shadow: 0 12px 36px var(--menu-paper-shadow);
  }

  button {
    font-family: inherit;
  }

  .deck-builder-header {
    display: grid;
    gap: 10px;
    padding-bottom: 16px;
    border-bottom: 2px solid #b8daf4;
  }

  .deck-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .deck-heading span {
    color: #4a81b7;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .deck-heading strong {
    display: block;
    margin-top: 3px;
    color: var(--menu-ink);
    font-size: clamp(26px, 4vw, 34px);
    font-weight: 950;
    line-height: 1.15;
    letter-spacing: -0.04em;
  }

  .deck-hint {
    margin: 0;
    color: #5e779a;
    font-size: 14px;
    line-height: 1.5;
  }

  .deck-close,
  .deck-done {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex: none;
    min-height: 44px;
    padding: 10px 16px;
    color: var(--menu-ink);
    background: var(--menu-blue-button);
    border: 1px solid #579ee5;
    border-radius: 12px;
    box-shadow:
      inset 0 0 0 2px #edfaff,
      0 3px #72a9e2;
    font-size: 14px;
    font-weight: 850;
    cursor: pointer;
    transition:
      transform 140ms ease,
      box-shadow 140ms ease;
  }

  .deck-close {
    width: 44px;
    height: 44px;
    padding: 0;
  }

  .deck-done:not(.deck-randomize) {
    min-width: 92px;
    background: var(--menu-yellow-button);
    border-color: #ffa10a;
    box-shadow:
      inset 0 0 0 2px #ffe88a,
      0 3px #e89716;
  }

  .deck-close:hover,
  .deck-done:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .deck-close:active,
  .deck-done:active:not(:disabled) {
    transform: translateY(2px);
  }

  .deck-done:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .deck-columns {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    touch-action: pan-y;
    padding: 5px 3px;
    scrollbar-gutter: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .deck-columns::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }

  .deck-column {
    display: grid;
    align-content: start;
    gap: 12px;
    min-width: 0;
    padding: 16px;
    background: #edf7ff;
    border: 1px solid #bad9f1;
    border-radius: 18px;
  }

  .deck-current-column {
    background: #fffaf0;
    border-color: #ead8a7;
  }

  .deck-panel .deck-section-title {
    margin: 0;
    padding-bottom: 9px;
    color: var(--menu-ink);
    border-bottom: 1px solid #c4def2;
    font-size: 14px;
    font-weight: 900;
    line-height: 1.5;
  }

  .deck-section-title:not(:first-child) {
    margin-top: 10px;
  }

  .deck-current-column .deck-section-title {
    border-color: #eadbb7;
  }

  .deck-grid.mini {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
    gap: 10px;
  }

  .deck-grid.mini .deck-tile {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 0;
    min-height: 84px;
    padding: 12px 6px;
    color: var(--menu-ink);
    background: #fbfdff;
    border: 1px solid #b5d9f7;
    border-radius: 13px;
    box-shadow:
      inset 0 0 0 2px #fff,
      0 3px #c4def2;
    cursor: pointer;
    transition:
      transform 140ms ease,
      box-shadow 140ms ease,
      border-color 140ms ease;
  }

  .deck-grid .deck-tile.special {
    background: #f4efff;
    border-color: #d0c0ec;
  }

  .deck-tile.selectable.selected {
    background: linear-gradient(155deg, #fffbe6, #ffecb2);
    border-color: #e8b649;
    box-shadow:
      inset 0 0 0 2px #fff7d8,
      0 3px #dfc27a;
  }

  .deck-tile.selectable:hover:not(:disabled) {
    transform: translateY(-2px);
    border-color: #659ed9;
    box-shadow:
      inset 0 0 0 2px #fff,
      0 5px 10px #274d7d21;
  }

  .deck-tile.selectable:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .deck-tile.selectable.selected:disabled {
    cursor: default;
    opacity: 1;
  }

  .deck-tile-check {
    position: absolute;
    top: 5px;
    right: 5px;
    display: grid;
    place-items: center;
    width: 19px;
    height: 19px;
    color: #fff;
    background: #2869ae;
    border: 2px solid #fff8da;
    border-radius: 50%;
  }

  .deck-tile-label {
    color: #625481;
    font-size: 11px;
    font-weight: 800;
    text-align: center;
  }

  .deck-empty {
    grid-column: 1 / -1;
    margin: 0;
    padding: 12px 0;
    color: #6c809d;
    font-size: 13px;
    line-height: 1.5;
    text-align: center;
    word-break: keep-all;
  }

  .deck-builder-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-top: 16px;
    border-top: 2px solid #b8daf4;
  }

  .deck-builder-footer p {
    min-width: 0;
    margin: 0;
    color: #5e779a;
    font-size: 13px;
    line-height: 1.5;
    word-break: keep-all;
  }

  .deck-builder-actions {
    display: flex;
    gap: 10px;
    flex: none;
  }

  button:focus-visible {
    outline: 3px solid var(--menu-outline);
    outline-offset: 2px;
  }

  @media (max-width: 720px) {
    && {
      padding: max(12px, env(safe-area-inset-top))
        max(12px, env(safe-area-inset-right))
        max(12px, env(safe-area-inset-bottom))
        max(12px, env(safe-area-inset-left));
    }

    .deck-panel.deck-builder {
      gap: 12px;
      max-height: calc(
        100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom)
      );
      padding: 16px;
      border-radius: 22px;
    }

    .deck-builder-header {
      gap: 8px;
      padding-bottom: 12px;
    }

    .deck-hint {
      font-size: 13px;
    }

    .deck-columns {
      grid-template-columns: minmax(0, 1fr);
    }

    .deck-current-column {
      display: none;
    }

    .deck-column {
      gap: 12px;
      padding: 12px;
      border-radius: 15px;
    }

    .deck-grid.mini {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .deck-grid.mini .deck-tile {
      min-height: 82px;
      padding: 10px 4px;
    }

    .deck-builder-footer {
      flex-wrap: wrap;
      gap: 10px;
      padding-top: 12px;
    }

    .deck-builder-footer p {
      flex-basis: 100%;
    }

    .deck-builder-actions {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      width: 100%;
    }

    .deck-done {
      padding-inline: 12px;
      font-size: 13px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }
  }
`;
