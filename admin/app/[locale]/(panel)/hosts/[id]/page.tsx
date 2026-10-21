import { getHostById } from "@/lib/data/hosts";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Badge } from "@/components/ui/Badge";
import { getWilayaName } from "@/lib/utils/wilayas";
import { formatDzd, formatDate } from "@/lib/utils/format";
import { ShieldCheck, FileCheck, Building } from "lucide-react";

export default async function HostDetailPage({
  params: { id, locale },
}: {
  params: { id: string; locale: string };
}) {
  const host = await getHostById(id);
  if (!host) notFound();

  return (
    <div className="space-y-6 text-start">
      <Breadcrumbs
        items={[
          { label: "Hosts", href: "/hosts" },
          { label: host.businessName || host.ownerName },
        ]}
      />

      <div className="p-6 rounded-3xl bg-white border border-tertiary/70 shadow-darna-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={host.ownerName} size={56} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-serif font-black text-primary">
                {host.businessName || host.ownerName}
              </h1>
              <Badge variant="secondary">{host.hostType}</Badge>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {host.email} · {host.phone} · {getWilayaName(host.wilayaCode, locale as any)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusPill
            label={host.status.replace("_", " ")}
            variant={host.status === "approved" ? "success" : "warning"}
            iconName="CheckCircle2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-tertiary/70 shadow-darna-card space-y-3 text-xs">
          <h3 className="font-bold text-primary text-sm">Financial Snapshot</h3>
          <div className="flex justify-between py-1 border-b border-neutral-100">
            <span className="text-neutral-500">Wallet Balance:</span>
            <span className="font-bold font-mono text-primary">{formatDzd(host.walletBalance, locale as any)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-neutral-100">
            <span className="text-neutral-500">Take-Rate:</span>
            <span className="font-bold font-mono">{host.commissionRate}%</span>
          </div>
          <div className="flex justify-between py-1 border-b border-neutral-100">
            <span className="text-neutral-500">Total Bookings:</span>
            <span className="font-bold">{host.bookingsCount}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-neutral-500">Active Fleet:</span>
            <span className="font-bold">{host.listingsCount} Listings</span>
          </div>
        </div>

        <div className="md:col-span-2 p-6 rounded-3xl bg-white border border-tertiary/70 shadow-darna-card space-y-4">
          <h3 className="font-bold text-primary text-sm">Verification Documents</h3>
          <div className="space-y-3">
            {host.documents.map((doc) => (
              <div key={doc.id} className="p-3.5 rounded-2xl bg-darnaBg/40 border border-tertiary/50 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-4 h-4 text-secondary shrink-0" />
                  <div>
                    <span className="font-bold text-primary block">{doc.title}</span>
                    <span className="text-[11px] text-neutral-400">Uploaded {formatDate(doc.uploadedAt, locale as any)}</span>
                  </div>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-lg border border-tertiary/70 text-xs font-bold hover:bg-white transition">
                  View File
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
