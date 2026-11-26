export const MIN_NICKNAME_LENGTH = 2;
export const MAX_NICKNAME_LENGTH = 20;

export function getNicknameLengthError(nickname: string): string | null {
  const length = nickname.trim().length;
  if (
    length < MIN_NICKNAME_LENGTH ||
    length > MAX_NICKNAME_LENGTH
  ) {
    return `닉네임은 최소 ${MIN_NICKNAME_LENGTH}자, 최대 ${MAX_NICKNAME_LENGTH}자입니다.`;
  }
  return null;
}
