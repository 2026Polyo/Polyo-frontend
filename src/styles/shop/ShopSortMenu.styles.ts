import styled from "@emotion/styled";

export const ShopSortControl = styled.div`
  position: relative;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: none;
  color: var(--menu-ink);

  > label {
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .shop-sort-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 132px;
    min-height: 42px;
    padding: 8px 11px;
    color: var(--menu-ink);
    background: var(--menu-blue-button);
    border: 1px solid #579ee5;
    border-radius: 12px;
    box-shadow:
      inset 0 0 0 2px #edfaff,
      0 3px #72a9e2;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
  }

  .shop-sort-trigger[aria-expanded="true"] {
    border-color: #397bc4;
    box-shadow:
      inset 0 0 0 2px #edfaff,
      0 2px #72a9e2;
  }

  .shop-sort-trigger svg {
    flex: none;
    color: #336ba4;
    transition: transform 140ms ease;
  }

  .shop-sort-trigger[aria-expanded="true"] svg {
    transform: rotate(180deg);
  }

  .shop-sort-options {
    position: absolute;
    top: calc(100% + 9px);
    right: 0;
    display: grid;
    gap: 4px;
    width: 180px;
    max-height: var(--sort-menu-height, 208px);
    overflow-y: auto;
    overscroll-behavior: contain;
    margin: 0;
    padding: 6px;
    color: var(--menu-ink);
    background: var(--menu-paper);
    border: 1px solid #8bbce7;
    border-radius: 15px;
    box-shadow:
      inset 0 0 0 2px #fff,
      0 4px #b8d9f2,
      0 12px 24px #143e6b2e;
    list-style: none;
    scrollbar-width: thin;
  }

  .shop-sort-options[data-side="top"] {
    top: auto;
    bottom: calc(100% + 9px);
  }

  [role="option"] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 42px;
    padding: 9px 11px;
    border: 1px solid transparent;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 750;
    line-height: 1.4;
    cursor: pointer;
    user-select: none;
  }

  [role="option"][data-active="true"] {
    background: #dcefff;
    border-color: #a7cfee;
  }

  [role="option"][aria-selected="true"] {
    color: #61430d;
    background: linear-gradient(155deg, #fffbe6, #ffecb2);
    border-color: #edc563;
    box-shadow: inset 0 0 0 1px #fff7d8;
  }

  [role="option"][aria-selected="true"][data-active="true"] {
    border-color: #c79828;
  }

  [role="option"] svg {
    flex: none;
    color: #2869ae;
  }

  @media (prefers-reduced-motion: reduce) {
    .shop-sort-trigger svg {
      transition: none;
    }
  }
`;
