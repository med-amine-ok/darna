import { NextResponse } from "next/server";

// Fallback official interbank rate (1 EUR = ~152.5 DZD)
const DEFAULT_RATE = 280;

let cachedRate: {
  rate: number;
  timestamp: number;
} | null = null;

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache

export const dynamic = "force-dynamic";

export async function GET() {
  const now = Date.now();

  // Return cached rate if fresh
  if (cachedRate && now - cachedRate.timestamp < CACHE_DURATION_MS) {
    return NextResponse.json({
      success: true,
      base: "EUR",
      target: "DZD",
      rate: cachedRate.rate,
      updatedAt: new Date(cachedRate.timestamp).toISOString(),
      source: "cache",
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://open.er-api.com/v6/latest/EUR", {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const dzdRate = data?.rates?.DZD;

      if (typeof dzdRate === "number" && dzdRate > 50 && dzdRate < 500) {
        cachedRate = {
          rate: Number(dzdRate.toFixed(2)),
          timestamp: now,
        };

        return NextResponse.json({
          success: true,
          base: "EUR",
          target: "DZD",
          rate: cachedRate.rate,
          updatedAt: new Date(cachedRate.timestamp).toISOString(),
          source: "live",
        });
      }
    }
  } catch (error) {
    console.warn("Live exchange rate fetch error, using fallback/cached rate:", error);
  }

  // Graceful fallback
  const fallbackRate = cachedRate?.rate || DEFAULT_RATE;
  return NextResponse.json({
    success: true,
    base: "EUR",
    target: "DZD",
    rate: fallbackRate,
    updatedAt: new Date(cachedRate?.timestamp || now).toISOString(),
    source: "fallback",
  });
}
