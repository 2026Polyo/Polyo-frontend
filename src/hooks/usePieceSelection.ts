import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_SNAP_DISTANCE } from "../constants/config";
import { SIZE } from "../constants/gameData";
import { cloneBoard, clearLines } from "../utils/boardUtils";
import { getBoardCellFromPoint, getDragPreviewPoint } from "../utils/pointerPlacement";
import {
  getClosestPlacement,
  getPlacementDistanceSquared,
  getSurroundingEmptyCells,
  placePiece
} from "../utils/placement";
import type {
  AnchorOffset,
  Board,
  BoardMetrics,
  CellCoord,
  PieceInstance,
  PlacementPosition,
  PointerPoint
} from "../types";

interface UsePieceSelectionParams {
  augmentChoiceOpen: boolean;
  availablePieces: PieceInstance[];
  board: Board;
  isPlaying: boolean;
  onPlace: (piece: PieceInstance, row: number, col: number) => void;
}

export interface UsePieceSelectionResult {
  anchorCell: CellCoord | null;
  boardMetrics: BoardMetrics;
  boardRef: React.RefObject<HTMLDivElement | null>;
  clearSelection: () => void;
  closestPlacementCell: PlacementPosition | null;
  cursorAnchorOffset: AnchorOffset | null;
  cursorPiece: PieceInstance | null;
  cursorPoint: PointerPoint | null;
  handlePieceSelect: (
    piece: PieceInstance,
    event: React.PointerEvent<HTMLButtonElement>,
    nextAnchorCell: CellCoord
  ) => void;
  handlePieceActivate: (piece: PieceInstance) => void;
  hoverCell: PlacementPosition | null;
  invalidPreview: boolean;
  previewCells: Set<string>;
  previewClearingCells: Set<string>;
  selectedPiece: PieceInstance | null;
  setHoverCell: React.Dispatch<React.SetStateAction<PlacementPosition | null>>;
}

export function usePieceSelection({
  augmentChoiceOpen,
  availablePieces,
  board,
  isPlaying,
  onPlace
}: UsePieceSelectionParams): UsePieceSelectionResult {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cursorPiece, setCursorPiece] = useState<PieceInstance | null>(null);
  const [anchorCell, setAnchorCell] = useState<CellCoord | null>(null);
  const [hoverCell, setHoverCell] = useState<PlacementPosition | null>(null);
  const [cursorPoint, setCursorPoint] = useState<PointerPoint | null>(null);
  const [boardMetrics, setBoardMetrics] = useState<BoardMetrics>({ cellGap: 2, cellSize: 26 });
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    start: PointerPoint;
    pointerType: string;
    moved: boolean;
  } | null>(null);
  const placeRef = useRef(onPlace);

  useEffect(() => { placeRef.current = onPlace; }, [onPlace]);

  const selectedPiece = availablePieces.find((p) => p.uid === selectedId) ?? null;

  const clearSelection = useCallback(() => {
    dragRef.current = null;
    setSelectedId(null);
    setCursorPiece(null);
    setAnchorCell(null);
    setHoverCell(null);
    setCursorPoint(null);
  }, []);

  useEffect(() => {
    if (augmentChoiceOpen || !isPlaying) clearSelection();
  }, [augmentChoiceOpen, isPlaying, clearSelection]);

  useEffect(() => {
    if (!isPlaying) return undefined;

    function updateBoardMetrics() {
      const el = boardRef.current;
      const firstCell = el?.querySelector(".board-cell");
      const secondCell = el?.querySelectorAll(".board-cell")[1];
      if (!firstCell) return;
      const firstRect = firstCell.getBoundingClientRect();
      const secondRect = secondCell?.getBoundingClientRect();
      const cellGap = secondRect ? Math.max(0, secondRect.left - firstRect.right) : 2;
      setBoardMetrics({ cellGap, cellSize: firstRect.width });
    }

    updateBoardMetrics();
    const observer = new ResizeObserver(updateBoardMetrics);
    if (boardRef.current) observer.observe(boardRef.current);
    window.addEventListener("resize", updateBoardMetrics);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateBoardMetrics);
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!selectedPiece || augmentChoiceOpen || !isPlaying) {
      dragRef.current = null;
      setCursorPiece(null);
      setAnchorCell(null);
      setCursorPoint(null);
      return undefined;
    }

    function cellAt(point: PointerPoint): PlacementPosition | null {
      const firstCell = boardRef.current?.querySelector(".board-cell");
      if (!firstCell) return null;
      const rect = firstCell.getBoundingClientRect();
      return getBoardCellFromPoint(point, { ...boardMetrics, left: rect.left, top: rect.top });
    }

    function handlePointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (drag && event.pointerId !== drag.pointerId) return;
      if (!drag && event.pointerType !== "mouse") return;
      const point = { x: event.clientX, y: event.clientY };
      if (drag) {
        drag.moved ||= Math.hypot(point.x - drag.start.x, point.y - drag.start.y) >= 6;
        if (!drag.moved && drag.pointerType === "touch") return;
      }
      const previewPoint = drag ? getDragPreviewPoint(point, drag.pointerType) : point;
      setCursorPiece(selectedPiece);
      setCursorPoint(previewPoint);
      setHoverCell(cellAt(previewPoint));
    }

    function handlePointerUp(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      dragRef.current = null;
      if (drag.pointerType === "touch") {
        setCursorPoint(null);
        setHoverCell(null);
      }
      if (!drag.moved || !anchorCell) return;
      const cell = cellAt(getDragPreviewPoint({ x: event.clientX, y: event.clientY }, drag.pointerType));
      if (!cell) return;
      const target = { row: cell.row - anchorCell[0], col: cell.col - anchorCell[1] };
      const closest = getClosestPlacement(board, selectedPiece, target);
      if (closest && getPlacementDistanceSquared(target, closest) <= MAX_SNAP_DISTANCE ** 2) {
        placeRef.current(selectedPiece!, closest.row, closest.col);
      }
    }

    function handlePointerCancel(event: PointerEvent) {
      if (dragRef.current?.pointerId === event.pointerId) clearSelection();
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Element &&
        (event.target.closest(".board") || event.target.closest(".tray"))
      ) {
        return;
      }
      clearSelection();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("blur", clearSelection);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("blur", clearSelection);
    };
  }, [selectedPiece, anchorCell, board, boardMetrics, augmentChoiceOpen, isPlaying, clearSelection]);

  const placementCell = useMemo<PlacementPosition | null>(() => {
    if (!selectedPiece || !hoverCell || !anchorCell) return null;
    return { row: hoverCell.row - anchorCell[0], col: hoverCell.col - anchorCell[1] };
  }, [selectedPiece, hoverCell, anchorCell]);

  const closestPlacementCell = useMemo(
    () => getClosestPlacement(board, selectedPiece, placementCell),
    [board, selectedPiece, placementCell]
  );

  const invalidPreview = Boolean(
    selectedPiece &&
      placementCell &&
      (!closestPlacementCell || getPlacementDistanceSquared(placementCell, closestPlacementCell) > MAX_SNAP_DISTANCE ** 2)
  );

  const cursorAnchorOffset: AnchorOffset | null = anchorCell
    ? {
        x: anchorCell[1] * (boardMetrics.cellSize + boardMetrics.cellGap) + boardMetrics.cellSize / 2,
        y: anchorCell[0] * (boardMetrics.cellSize + boardMetrics.cellGap) + boardMetrics.cellSize / 2
      }
    : null;

  const previewCells = useMemo<Set<string>>(() => {
    if (!selectedPiece || !closestPlacementCell || invalidPreview) return new Set();
    const cells = new Set(
      selectedPiece.cells.map(
        ([dr, dc]) => `${closestPlacementCell.row + dr}-${closestPlacementCell.col + dc}`
      )
    );
    // The fill block also highlights the empty cells it will fill in.
    if (selectedPiece.special === "fill") {
      const placed = placePiece(board, selectedPiece, closestPlacementCell.row, closestPlacementCell.col);
      getSurroundingEmptyCells(placed.placedBoard, selectedPiece, closestPlacementCell.row, closestPlacementCell.col)
        .forEach(({ row, col }) => cells.add(`${row}-${col}`));
    }
    return cells;
  }, [board, closestPlacementCell, invalidPreview, selectedPiece]);

  const previewClearingCells = useMemo<Set<string>>(() => {
    if (!selectedPiece || !closestPlacementCell || invalidPreview) return new Set();

    if (selectedPiece.special === "line") {
      const cross = new Set<string>();
      selectedPiece.cells.forEach(([dr, dc]) => {
        const cellRow = closestPlacementCell.row + dr;
        const cellCol = closestPlacementCell.col + dc;
        for (let i = 0; i < SIZE; i += 1) {
          cross.add(`${cellRow}-${i}`);
          cross.add(`${i}-${cellCol}`);
        }
      });
      return cross;
    }

    const result = placePiece(board, selectedPiece, closestPlacementCell.row, closestPlacementCell.col);

    if (selectedPiece.special === "fill") {
      const filledBoard = cloneBoard(result.placedBoard);
      getSurroundingEmptyCells(filledBoard, selectedPiece, closestPlacementCell.row, closestPlacementCell.col)
        .forEach(({ row, col }) => { filledBoard[row][col] = selectedPiece.color; });
      return new Set(clearLines(filledBoard).clearedCells);
    }

    return new Set(result.clearedCells);
  }, [board, closestPlacementCell, invalidPreview, selectedPiece]);

  function handlePieceSelect(
    piece: PieceInstance,
    event: React.PointerEvent<HTMLButtonElement>,
    nextAnchorCell: CellCoord
  ) {
    if (augmentChoiceOpen || !isPlaying || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();

    if (piece.uid === selectedId) {
      clearSelection();
      return;
    }

    setSelectedId(piece.uid);
    setCursorPiece(piece);
    setAnchorCell(nextAnchorCell);
    setHoverCell(null);
    const point = { x: event.clientX, y: event.clientY };
    setCursorPoint(event.pointerType === "touch" ? null : point);
    dragRef.current = { pointerId: event.pointerId, start: point, pointerType: event.pointerType, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePieceActivate(piece: PieceInstance) {
    if (augmentChoiceOpen || !isPlaying) return;
    clearSelection();
    if (piece.uid === selectedId) return;
    setSelectedId(piece.uid);
    setAnchorCell(piece.cells[0]);
  }

  return {
    anchorCell,
    boardMetrics,
    boardRef,
    clearSelection,
    closestPlacementCell,
    cursorAnchorOffset,
    cursorPiece,
    cursorPoint,
    handlePieceSelect,
    handlePieceActivate,
    hoverCell,
    invalidPreview,
    previewCells,
    previewClearingCells,
    selectedPiece,
    setHoverCell
  };
}
