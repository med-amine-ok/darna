/**
 * What a host keeps from a booking (pure, client-safe display helper built
 * only from amounts the backend returned on the booking).
 *
 * The guest pays the host directly (DEC-001): the host receives the booking
 * total, owes back any refund due after a cancellation, and BLADUS takes its
 * commission from the host's prepaid deposit.
 */
import type { Reservation } from "@/types";

export interface HostPayout {
  subtotal: number;
  discount: number;
  cleaningFee: number;
  commission: number;
  refunded: number;
  net: number;
}

export function computeHostPayout(
  res: Pick<
    Reservation,
    "status" | "totalPrice" | "subtotal" | "discount" | "cleaningFee" | "taxes" | "refundAmount" | "commissionAmount"
  >
): HostPayout {
  const cleaningFee = res.cleaningFee ?? 0;
  const discount = res.discount ?? 0;
  const subtotal = res.subtotal ?? Math.max(0, res.totalPrice + discount - cleaningFee - (res.taxes ?? 0));
  const commission = res.commissionAmount ?? 0;
  if (res.status === "declined" || res.status === "expired") {
    return { subtotal, discount, cleaningFee, commission: 0, refunded: 0, net: 0 };
  }
  const refunded = Math.min(res.totalPrice, Math.max(0, res.refundAmount ?? 0));
  return {
    subtotal,
    discount,
    cleaningFee,
    commission,
    refunded,
    net: Math.max(0, res.totalPrice - refunded - commission),
  };
}
