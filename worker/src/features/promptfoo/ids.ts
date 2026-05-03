import { createHash } from "crypto";

export function createPromptfooDeterministicUuid(parts: string[]): string {
  const hash = createHash("sha256").update(parts.join("\0")).digest("hex");
  const variant = ((parseInt(hash[16] ?? "0", 16) & 0x3) | 0x8).toString(16);

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    `${variant}${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}
