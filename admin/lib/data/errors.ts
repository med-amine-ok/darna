import "server-only";

/**
 * A business rule rejected the operation (illegal state transition, amount
 * above the refundable balance, insufficient wallet funds, already processed…).
 * Mapped by runAction to `{ ok: false, code: "conflict" }`.
 */
export class DomainError extends Error {
  readonly code = "conflict" as const;
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

/** Input that passed type checks but violates a domain constraint. */
export class ValidationError extends Error {
  readonly code = "invalid" as const;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
