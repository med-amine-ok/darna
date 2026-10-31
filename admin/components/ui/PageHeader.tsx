"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Link, useRouter } from "@/navigation";
import { DropdownMenu } from "./DropdownMenu";

export interface PageHeaderAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "secondary" | "accent";
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onExport?: () => void;
  exportLabel?: string;
  actions?: PageHeaderAction[] | React.ReactNode;
  children?: React.ReactNode;
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

const getButtonClass = (variant?: string) => {
  switch (variant) {
    case "primary":
      return "bg-primary-800 hover:bg-primary-900 text-white shadow-e1 shadow-highlight";
    case "secondary":
      return "bg-secondary-700 hover:bg-secondary-800 text-white shadow-e1";
    case "accent":
      return "bg-white text-accent-700 ring-1 ring-inset ring-accent/40 hover:bg-accent-50";
    default:
      return "bg-white text-primary-800 shadow-e1 hover:shadow-e2 hover:bg-darnaBg-50";
  }
};

/** Internal paths go through the locale-aware Link; anything else stays a plain anchor. */
const ActionLink: React.FC<{ href: string; className: string; children: React.ReactNode }> = ({ href, className, children }) =>
  href.startsWith("/") ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} className={className}>
      {children}
    </a>
  );

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  onExport,
  exportLabel,
  actions = [],
  children,
}) => {
  const t = useTranslations("uiKit.pageHeader");
  const router = useRouter();
  const isCustomActions = React.isValidElement(actions);
  const actionList = Array.isArray(actions) ? (actions as PageHeaderAction[]) : [];

  // Split actions for mobile: primary action stays visible, others collapse into ... on mobile
  const primaryAction = actionList.find((a) => a.variant === "primary") || actionList[0];
  const secondaryActions = actionList.filter((a) => a !== primaryAction);

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
      {/* Title & Subtitle */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="font-serif text-heading text-primary-900 break-words">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-meta text-primary-600 mt-1 line-clamp-2">
            {subtitle}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center flex-wrap gap-2 shrink-0">
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className={`inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-xl bg-white shadow-e1 hover:shadow-e2 hover:bg-darnaBg-50 text-meta font-semibold text-primary-800 transition duration-fast ease-standard cursor-pointer active:scale-[0.98] ${focusRing}`}
          >
            <Download className="w-4 h-4 text-primary-500" aria-hidden="true" />
            <span>{exportLabel ?? t("export")}</span>
          </button>
        )}

        {isCustomActions ? (
          actions
        ) : (
          <>
            {/* Desktop: render all action buttons */}
            <div className="hidden sm:flex items-center gap-2">
              {actionList.map((act, idx) => {
                const btnClass = getButtonClass(act.variant);
                if (act.href) {
                  return (
                    <ActionLink
                      key={idx}
                      href={act.href}
                      className={`inline-flex items-center justify-center gap-2 min-h-[38px] px-4 py-2 rounded-xl text-meta font-semibold transition duration-fast ease-standard select-none ${btnClass} ${focusRing}`}
                    >
                      {act.icon}
                      <span>{act.label}</span>
                    </ActionLink>
                  );
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={act.onClick}
                    className={`inline-flex items-center justify-center gap-2 min-h-[38px] px-4 py-2 rounded-xl text-meta font-semibold transition duration-fast ease-standard cursor-pointer select-none active:scale-[0.98] ${btnClass} ${focusRing}`}
                  >
                    {act.icon}
                    <span>{act.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile (< sm): render primary action + dropdown for secondary actions */}
            <div className="flex sm:hidden items-center gap-2 w-full">
              {primaryAction &&
                (primaryAction.href ? (
                  <ActionLink
                    href={primaryAction.href}
                    className={`flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-meta font-semibold transition duration-fast ease-standard select-none ${getButtonClass(
                      primaryAction.variant
                    )} ${focusRing}`}
                  >
                    {primaryAction.icon}
                    <span className="truncate">{primaryAction.label}</span>
                  </ActionLink>
                ) : (
                  <button
                    type="button"
                    onClick={primaryAction.onClick}
                    className={`flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl text-meta font-semibold transition duration-fast ease-standard cursor-pointer select-none active:scale-[0.98] ${getButtonClass(
                      primaryAction.variant
                    )} ${focusRing}`}
                  >
                    {primaryAction.icon}
                    <span className="truncate">{primaryAction.label}</span>
                  </button>
                ))}

              {secondaryActions.length > 0 && (
                <DropdownMenu
                  triggerLabel={t("moreActions")}
                  items={secondaryActions.map((act) => ({
                    label: act.label,
                    icon: act.icon,
                    onClick:
                      act.onClick ||
                      (act.href
                        ? () => {
                            const href = act.href as string;
                            if (href.startsWith("/")) router.push(href);
                            else window.location.assign(href);
                          }
                        : () => {}),
                    variant: act.variant === "accent" ? "danger" : "default",
                  }))}
                />
              )}
            </div>
          </>
        )}

        {children}
      </div>
    </div>
  );
};
