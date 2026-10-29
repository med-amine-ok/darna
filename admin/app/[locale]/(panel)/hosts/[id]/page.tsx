import { guardPage } from "@/lib/auth/page-guard";
import { getHostById } from "@/lib/data/hosts";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Badge } from "@/components/ui/Badge";
import { getWilayaName } from "@/lib/utils/wilayas";
import { formatDzd, formatDate, formatNumber, intlLocale } from "@/lib/utils/format";
import { FileCheck } from "lucide-react";

export const generateMetadata = pageMetadata("hostDetail");

export default async function HostDetailPage({
  params: { id, locale },
}: {
  params: { id: string; locale: string };
}) {
  const denied = await guardPage("hosts.view");
  if (denied) return denied;

  const host = await getHostById(id);
  if (!host) notFound();

  const t = await getTranslations({ locale, namespace: "hostDetail" });
  const tHostTypes = await getTranslations({ locale, namespace: "hostTypes" });
  const hostTypeLabel = tHostTypes.has(host.hostType) ? tHostTypes(host.hostType) : host.hostType;
  const commission = new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(host.commissionRate / 100);

  return (
    <div className="space-y-6 text-start">
      <Breadcrumbs
        items={[
          { label: t("breadcrumb"), href: "/hosts" },
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
              <Badge variant="secondary">{hostTypeLabel}</Badge>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {host.email} · <span dir="ltr">{host.phone}</span> · {getWilayaName(host.wilayaCode, locale)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusPill
            status={host.status}
            variant={host.status === "approved" ? "success" : "warning"}
            iconName="CheckCircle2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-tertiary/70 shadow-darna-card space-y-3 text-xs">
          <h2 className="font-bold text-primary text-sm">{t("financialSnapshot")}</h2>
          <dl className="space-y-3">
            <div className="flex justify-between py-1 border-b border-neutral-100">
              <dt className="text-neutral-500">{t("walletBalance")}</dt>
              <dd className="font-bold font-mono text-primary">{formatDzd(host.walletBalance, locale)}</dd>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-100">
              <dt className="text-neutral-500">{t("takeRate")}</dt>
              <dd className="font-bold font-mono">{commission}</dd>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-100">
              <dt className="text-neutral-500">{t("totalBookings")}</dt>
              <dd className="font-bold">{formatNumber(host.bookingsCount, locale)}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-neutral-500">{t("activeFleet")}</dt>
              <dd className="font-bold">{t("listingsValue", { count: host.listingsCount })}</dd>
            </div>
          </dl>
        </div>

        <div className="md:col-span-2 p-6 rounded-3xl bg-white border border-tertiary/70 shadow-darna-card space-y-4">
          <h2 className="font-bold text-primary text-sm">{t("verificationDocuments")}</h2>
          <ul className="space-y-3">
            {host.documents.map((doc) => (
              <li key={doc.id} className="p-3.5 rounded-2xl bg-darnaBg/40 border border-tertiary/50 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-4 h-4 text-secondary shrink-0" aria-hidden="true" />
                  <div>
                    <span className="font-bold text-primary block">{doc.title}</span>
                    <span className="text-[11px] text-neutral-500">
                      {t("uploaded", { date: formatDate(doc.uploadedAt, locale) })}
                    </span>
                  </div>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("viewFileLabel", { title: doc.title })}
                  className="px-3 py-1 rounded-lg border border-tertiary/70 text-xs font-bold hover:bg-white transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                >
                  {t("viewFile")}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
