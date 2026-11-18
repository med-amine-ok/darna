import { guardPage } from "@/lib/auth/page-guard";
import { getHostDetail } from "@/lib/data/hosts";
import { Link } from "@/navigation";
import { HostDocumentsList, CreditLimitForm } from "./HostDetailActions";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Badge } from "@/components/ui/Badge";
import { getWilayaName } from "@/lib/utils/wilayas";
import { formatDzd, formatDate, formatNumber, intlLocale } from "@/lib/utils/format";

export const generateMetadata = pageMetadata("hostDetail");

export default async function HostDetailPage({
  params: { id, locale },
}: {
  params: { id: string; locale: string };
}) {
  const denied = await guardPage("hosts.view");
  if (denied) return denied;

  const detail = await getHostDetail(id);
  if (!detail) notFound();
  const { host, extras } = detail;

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

      <div className="p-6 rounded-2xl bg-white shadow-e1 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={host.ownerName} size={56} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-heading text-primary-900">
                {host.businessName || host.ownerName}
              </h1>
              <Badge variant="secondary">{hostTypeLabel}</Badge>
            </div>
            <p className="text-xs text-primary-600 mt-1">
              {host.email}
              {host.phone && (
                <>
                  {" · "}
                  <span dir="ltr">{host.phone}</span>
                </>
              )}
              {host.wilayaCode && <> · {getWilayaName(host.wilayaCode, locale)}</>}
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
        <div className="p-6 rounded-2xl bg-white shadow-e1 space-y-3 text-xs">
          <h2 className="font-semibold text-primary text-sm">{t("financialSnapshot")}</h2>
          <dl className="space-y-3">
            <div className="flex justify-between py-1 border-b border-primary/[0.08]">
              <dt className="text-primary-600">{t("walletBalance")}</dt>
              <dd className="font-semibold font-mono text-primary">{formatDzd(host.walletBalance, locale)}</dd>
            </div>
            <div className="flex justify-between py-1 border-b border-primary/[0.08]">
              <dt className="text-primary-600">{t("takeRate")}</dt>
              <dd className="font-semibold font-mono">{commission}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-primary-600">{t("reviews")}</dt>
              <dd className="font-semibold">
                {host.rating ? `${host.rating.toFixed(1)} / 5 · ` : ""}
                {formatNumber(host.reviewsCount, locale)}
              </dd>
            </div>
          </dl>
          <Link
            href={`/payments/wallets?host=${encodeURIComponent(host.id)}`}
            className="inline-flex font-semibold text-accent-700 underline underline-offset-2"
          >
            {t("openWallet")}
          </Link>
          <div className="pt-3 border-t border-primary/[0.08]">
            <h3 className="font-semibold text-primary text-xs mb-2">{t("creditLimitTitle")}</h3>
            <CreditLimitForm hostId={host.id} currentDzd={extras.creditLimitDzd} />
          </div>
          {extras.legal && (
            <div className="pt-3 border-t border-primary/[0.08] space-y-1">
              <h3 className="font-semibold text-primary text-xs">{t("legalTitle")}</h3>
              {extras.legal.legalName && <p>{extras.legal.legalName}</p>}
              {extras.legal.rc && <p dir="ltr">RC {extras.legal.rc}</p>}
              {extras.legal.nif && <p dir="ltr">NIF {extras.legal.nif}</p>}
              {extras.legal.nis && <p dir="ltr">NIS {extras.legal.nis}</p>}
              {extras.legal.tourismLicence && <p dir="ltr">{extras.legal.tourismLicence}</p>}
            </div>
          )}
        </div>

        <div className="md:col-span-2 p-6 rounded-2xl bg-white shadow-e1 space-y-4">
          <h2 className="font-semibold text-primary text-sm">{t("verificationDocuments")}</h2>
          <HostDocumentsList documents={host.documents} />
          {extras.requiredDocuments.length > 0 && (
            <div className="pt-2">
              <h3 className="font-semibold text-primary text-xs mb-2">{t("requiredDocuments")}</h3>
              <ul className="flex flex-wrap gap-2 text-[11px]">
                {extras.requiredDocuments.map((d) => (
                  <li key={d.docType} className="px-2.5 py-1 rounded-full bg-darnaBg-100 text-primary-700">
                    {d.label}: <strong>{d.status}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
