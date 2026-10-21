import { getWallets } from "@/lib/data/wallet";
import AdminWalletsClient from "@/components/admin/AdminWalletsClient";

export const metadata = {
  title: "Host Wallets & Ledger | Admin | DARNA",
  description: "Manage host prepaid deposit balances, offline recharges, and commission deduction audit logs.",
};

export default async function AdminWalletsPage() {
  const wallets = await getWallets();

  return <AdminWalletsClient initialWallets={wallets} />;
}
