import styled from "@emotion/styled";

export const PracticeStage = styled.section`
  && {
    width: min(100%, 900px);
    margin-inline: auto;
  }

  .practice-workspace {
    display: grid;
    grid-template-columns: minmax(0, 530px) minmax(220px, 300px);
    justify-content: center;
    align-items: start;
    gap: 24px;
  }

  .practice-board-column {
    min-width: 0;
  }

  .placement-hint {
    color: var(--text-muted);
  }

  .practice-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    margin-bottom: 14px;
    color: var(--text-strong);
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }

  .practice-controls label {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-width: 0;
    font-size: 13px;
    font-weight: 800;
  }

  .practice-controls select {
    flex: 1;
    min-width: 0;
    min-height: 42px;
    padding: 6px 10px;
    color: var(--text-strong);
    background: var(--surface-card-soft);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    font: inherit;
  }

  .practice-actions {
    display: flex;
    justify-content: center;
    margin-top: 12px;
  }

  .practice-palette {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    align-content: start;
    gap: 10px;
    min-width: 0;
    max-height: min(720px, calc(100dvh - 48px));
    padding: 16px;
    color: var(--text-strong);
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }

  .practice-palette-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .practice-palette h2 {
    margin: 0;
    font-size: 19px;
  }
  .practice-palette-heading > span {
    color: var(--text-muted);
    font-size: 12px;
  }
  .practice-palette > p {
    margin: 0;
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .practice-block-list.tray {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-content: start;
    gap: 8px;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    margin: 0;
    padding: 5px;
    background: transparent;
    border: 0;
    box-shadow: none;
    scrollbar-width: thin;
    scrollbar-color: var(--surface-card-border) transparent;
  }

  .practice-block-list .piece-preview {
    width: 100%;
    height: 82px;
    min-width: 0;
    padding: 6px;
    touch-action: pan-y;
    background: var(--surface-card-soft);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
  }

  .practice-block-list .piece-preview .mini-grid {
    --mini-cell-size: var(--practice-cell-size) !important;
    --mini-cell-gap: 2px !important;
    gap: 2px;
  }

  .practice-block-list .piece-preview.selected {
    box-shadow: inset 0 0 0 2px var(--accent);
    border-color: var(--accent);
  }

  .practice-block-list .piece-preview:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .practice-block-list .piece-preview:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }

  @media (max-width: 720px) {
    && {
      width: min(100%, 530px);
    }
    .practice-workspace {
      grid-template-columns: minmax(0, 1fr);
      gap: 20px;
    }
    .practice-palette {
      max-height: 340px;
      padding: 12px;
    }
    .practice-block-list.tray {
      grid-template-columns: none;
      grid-template-rows: repeat(2, 76px);
      grid-auto-flow: column;
      grid-auto-columns: 82px;
      overflow-x: auto;
      overflow-y: hidden;
      touch-action: pan-x;
    }
    .practice-block-list .piece-preview {
      height: 76px;
      touch-action: pan-x;
    }
  }
`;

export const PracticeCursorLayer = styled.div`
  position: fixed;
  inset: 0;
  z-index: 40;
  overflow: clip;
  contain: paint;
  pointer-events: none;

  .cursor-piece {
    position: absolute;
    pointer-events: none;
  }
`;

export const PracticeHeader = styled.header`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 8px;
  min-height: 44px;
  margin-bottom: 14px;

  > button {
    grid-column: 1;
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    min-height: 44px;
    padding: 8px 10px;
    font-size: 13px;
    white-space: nowrap;
  }

  > h1 {
    grid-column: 2;
    margin: 0;
    color: var(--text-strong);
    font-size: clamp(19px, 5vw, 28px);
    text-align: center;
    white-space: nowrap;
  }

  @media (max-width: 380px) {
    column-gap: 4px;

    > button {
      gap: 4px;
      padding: 6px 4px;
      font-size: 12px;
    }

    > button svg {
      width: 16px;
      height: 16px;
    }

    > h1 {
      font-size: 18px;
    }
  }
`;
