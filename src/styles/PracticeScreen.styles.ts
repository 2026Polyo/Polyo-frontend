import styled from "@emotion/styled";

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
    color: var(--text-on-board);
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
