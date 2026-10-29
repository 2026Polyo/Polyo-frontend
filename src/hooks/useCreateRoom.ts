import { useEffect, useRef, useState } from "react";
import {
  createInitialRoomValues,
  toCreateRoomInput,
  validateRoomForm
} from "../features/matchroom";
import type { CreatedMatchRoom, CreateRoomHandler, RoomFormValues } from "../features/matchroom";
import { MatchRoomApiError } from "../features/matchroomApi";

type SubmissionStatus = "idle" | "submitting" | "success";

export function useCreateRoom(onCreateRoom: CreateRoomHandler) {
  const [values, setValues] = useState(createInitialRoomValues);
  const [touched, setTouched] = useState({ roomName: false });
  const [createdRoom, setCreatedRoom] = useState<CreatedMatchRoom | null>(null);
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const completedRef = useRef(false);
  const errors = validateRoomForm(values);
  const isSubmitting = status === "submitting";
  const isComplete = status === "success";

  useEffect(() => () => requestRef.current?.abort(), []);

  function updateValue<Key extends keyof RoomFormValues>(key: Key, value: RoomFormValues[Key]) {
    if (requestRef.current || completedRef.current) return;
    setValues((current) => ({ ...current, [key]: value }));
    setSubmissionError(null);
  }

  function touchField(field: "roomName") {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function submit(): Promise<void> {
    // The ref locks immediately, including before React renders the disabled button.
    if (requestRef.current || completedRef.current) return;
    setTouched({ roomName: true });
    if (Object.keys(errors).length > 0) return;

    const controller = new AbortController();
    requestRef.current = controller;
    setStatus("submitting");
    setSubmissionError(null);

    try {
      const result = await onCreateRoom(toCreateRoomInput(values), controller.signal);
      if (controller.signal.aborted) return;
      completedRef.current = true;
      setCreatedRoom(result);
      setStatus("success");
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus("idle");
      setSubmissionError(
        error instanceof MatchRoomApiError
          ? error.message
          : "연결 상태를 확인하고 다시 시도해 주세요."
      );
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isComplete,
    isValid: Object.keys(errors).length === 0,
    submissionError,
    createdRoom,
    updateValue,
    touchField,
    submit
  };
}
