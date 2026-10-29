"use server";

import * as network from "@/lib/data/network";
import { runAction } from "@/lib/auth/run-action";
import type { NetworkSearchParams } from "@/lib/types";

export async function searchNetwork(params: NetworkSearchParams = {}) {
  return runAction("listings.view", () => network.searchNetwork(params ?? {}));
}
