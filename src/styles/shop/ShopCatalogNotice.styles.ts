import styled from "@emotion/styled";

export const ShopCatalogNotice = styled.div`
  position: fixed;
  z-index: 70;
  left: 50%;
  bottom: max(20px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  width: max-content;
  max-width: calc(100vw - 32px);
  padding: 10px 12px 10px 16px;
  color: #61430d;
  background: #fff8da;
  border: 2px solid #fff5ab;
  border-radius: 14px;
  box-shadow:
    0 4px #d6b66a,
    0 10px 24px #143e6b2e;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;

  > span {
    min-width: 0;
  }

  > button {
    flex: none;
    min-height: 38px;
    padding: 7px 10px;
    color: #101b50;
    background: linear-gradient(160deg, #effaff, #b5dcf8);
    border: 1px solid #579ee5;
    border-radius: 9px;
    box-shadow:
      inset 0 0 0 1px #edfaff,
      0 2px #72a9e2;
    font: inherit;
    cursor: pointer;
  }

  > button:focus-visible {
    outline: 3px solid #07318a;
    outline-offset: 3px;
  }
`;
