import { describe, expect, it } from "vitest";
import { createInitialRoomValues, getRoomNameLength, toCreateRoomInput, validateRoomForm } from "../matchroom";
import type { RoomFormValues } from "../matchroom";

describe("room creation input", () => {
  it("starts with an empty public room", () => {
    expect(createInitialRoomValues()).toEqual({ roomName: "", isPrivate: false });
  });

  it.each(["", " \t\n", "가".repeat(31), "🎮".repeat(31)])("rejects invalid name %j", (roomName) => {
    expect(validateRoomForm({ roomName, isPrivate: false }).roomName).toBeDefined();
  });

  it.each(["가", "가".repeat(30), "🎮".repeat(30), "  같이 한 판  "])("accepts name %j", (roomName) => {
    expect(validateRoomForm({ roomName, isPrivate: true })).toEqual({});
  });

  it("counts Unicode code points", () => {
    expect(getRoomNameLength("가🎮나")).toBe(3);
  });

  it.each([true, false])("trims name and sends only server-defined fields (%s)", (isPrivate) => {
    const values = { roomName: "  같이  한 판  ", isPrivate, maxPlayers: 4, password: "1234", hostUserId: 99 };
    expect(toCreateRoomInput(values)).toEqual({ roomName: "같이  한 판", isPrivate });
  });

  it("rejects invalid runtime types", () => {
    const values = { roomName: null, isPrivate: "false" } as unknown as RoomFormValues;
    expect(validateRoomForm(values)).toMatchObject({ roomName: expect.any(String), isPrivate: expect.any(String) });
  });

  it("does not submit invalid settings", () => {
    expect(() => toCreateRoomInput(createInitialRoomValues())).toThrow("방 설정을 확인해 주세요.");
  });
});
