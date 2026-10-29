import { useEffect, useRef, useState } from "react";
import type { MatchRoomApi, MatchRoomDetails, MatchRoomPage } from "../features/matchroom";
import { MatchRoomApiError } from "../features/matchroomApi";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof MatchRoomApiError ? error.message : fallback;
}

export function useMatchRoomLobby(api: MatchRoomApi) {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<MatchRoomPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState<number | null>(null);
  const [joinedRoom, setJoinedRoom] = useState<MatchRoomDetails | null>(null);
  const joinRequestRef = useRef<AbortController | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError(null);
    setData(null);
    void api.list(page, controller.signal).then((result) => {
      if (!controller.signal.aborted) setData(result);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setListError(errorMessage(error, "방 목록을 불러오지 못했어요. 다시 시도해 주세요."));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [api, page, revision]);

  useEffect(() => () => joinRequestRef.current?.abort(), []);

  async function join(request: (signal: AbortSignal) => Promise<MatchRoomDetails>, roomId: number | null): Promise<boolean> {
    if (joinRequestRef.current || joinedRef.current) return false;
    const controller = new AbortController();
    joinRequestRef.current = controller;
    setJoining(true);
    setJoiningRoomId(roomId);
    setJoinError(null);
    try {
      const result = await request(controller.signal);
      if (controller.signal.aborted) return false;
      joinedRef.current = true;
      setJoinedRoom(result);
      return true;
    } catch (error) {
      if (!controller.signal.aborted) setJoinError(errorMessage(error, "방에 접속하지 못했어요. 다시 시도해 주세요."));
      return false;
    } finally {
      if (joinRequestRef.current === controller) joinRequestRef.current = null;
      if (!controller.signal.aborted) {
        setJoining(false);
        setJoiningRoomId(null);
      }
    }
  }

  function refresh() {
    if (joinRequestRef.current) return;
    setJoinError(null);
    setRevision((current) => current + 1);
  }

  function returnToList() {
    joinedRef.current = false;
    setJoinedRoom(null);
    setJoinError(null);
    refresh();
  }

  return {
    page, data, loading, listError, joinError, joining, joiningRoomId, joinedRoom,
    setPage, refresh, returnToList,
    clearJoinError: () => setJoinError(null),
    joinById: (roomId: number) => join((signal) => api.joinById(roomId, signal), roomId),
    joinByCode: (entryCode: string) => join((signal) => api.joinByCode(entryCode, signal), null)
  };
}
