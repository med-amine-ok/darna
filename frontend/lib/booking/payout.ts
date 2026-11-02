/**
 * Host payout for a reservation (pure, client-safe display helper).
 * The host earns the accommodation subtotal + cleaning fee, minus BLADUS's
 * commission (charged on the subtotal only) and minus any guest refund.
 * BLADUS's guest service fee never goes to the host.
 */
import type { Reservation } from "@/types";

export interface HostPayout {
  subtotal: number;
  cleaningFee: number;
  commission: number;
  refunded: number;
  net: number;
}

export function computeHostPayout(
  res: Pick<
    Reservation,
    "status" | "totalPrice" | "subtotal" | "cleaningFee" | "serviceFee" | "taxes" | "refundAmount" | "commissionAmount"
  >
): HostPayout {
  const cleaningFee = res.cleaningFee ?? 0;
  const serviceFee = res.serviceFee ?? 0;
  const subtotal = res.subtotal ?? Math.max(0, res.totalPrice - cleaningFee - serviceFee - (res.taxes ?? 0));
  const commission = res.commissionAmount ?? 0;
  if (res.status === "declined" || res.status === "expired") {
    return { subtotal, cleaningFee, commission: 0, refunded: 0, net: 0 };
  }
  // Full refunds include the service fee; partial refunds come out of the host's share.
  const refund = res.refundAmount ?? 0;
  const refunded = refund >= res.totalPrice ? subtotal + cleaningFee : Math.min(subtotal + cleaningFee, refund);
  return { subtotal, cleaningFee, commission, refunded, net: Math.max(0, subtotal + cleaningFee - refunded - commission) };
}
