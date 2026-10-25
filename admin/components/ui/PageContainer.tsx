"use client";

import React from "react";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = "",
  fullWidth = false,
  ...props
}) => {
  return (
    <div
      className={`w-full px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 transition-all pb-24 lg:pb-8 ${
        fullWidth ? "max-w-none" : "max-w-7xl mx-auto"
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  children,
  className = "",
  title,
  subtitle,
  action,
  ...props
}) => {
  return (
    <section className={`space-y-3 sm:space-y-4 ${className}`} {...props}>
      {(title || subtitle || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            {title && (
              <h3 className="text-sm sm:text-base font-bold text-primary tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-neutral-500 leading-relaxed mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
};
