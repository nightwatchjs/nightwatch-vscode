import { randomUUID } from "crypto";

export function getNonce(): string {
  return randomUUID();
}
