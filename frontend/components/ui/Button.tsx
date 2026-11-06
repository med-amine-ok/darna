"use client";

/**
 * Button / IconButton, the BLADUS action primitives.
 *
 *   <Button>Reserve</Button>                                   // primary terracotta glow pill
 *   <Button variant="secondary" size="lg" fullWidth>Continue</Button>
 *   <Button variant="tertiary" leadingIcon={<BrandShareIcon size={16} />}>Share</Button>
 *   <Button loading={saving} success={saved}>Save</Button>    // spinner → check morph
 *   <Button href="/trips" variant="ghost">My trips</Button>    // renders a locale-aware Link
 *   <IconButton label="Close" icon={<BrandCloseIcon size={18} />} />
 *
 * Variants: primary (bg-cta + shadow-glow, one per view), secondary (ink), tertiary (white e1),
 * ghost (text), destructive (terracotta-700). Sizes sm (40) / md (44) / lg (48).
 * Press uses the `spring.press` scale; colours/shadows use CSS `duration-fast ease-standard`.
 */

import React, { forwardRef } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Link } from "@/navigation";
import { dur, ease, spring } from "@/lib/motion";
import { cn, focusRing } from "./cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "ghost"
  | "destructive"
  | "confirm";
export type ButtonSize = "sm" | "md" | "lg";

type NativeButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onDragOver"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
>;

export interface ButtonProps extends NativeButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, sets aria-busy and blocks clicks (the label stays so the width doesn't jump). */
  loading?: boolean;
  /** Morphs the icon slot into a drawn check mark (e.g. "Saved"). */
  success?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
  /** Renders a locale-aware `Link` from "@/navigation" styled as a button. */
  href?: string;
  /** Extra props for the Link when `href` is set. */
  linkProps?: {
    target?: string;
    rel?: string;
    prefetch?: boolean;
    scroll?: boolean;
    replace?: boolean;
  };
}

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none cursor-pointer " +
  "transition-[background-color,box-shadow,color,filter,opacity] duration-fast ease-standard " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50 " +
  focusRing;

export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-cta text-white shadow-glow hover:brightness-110 active:brightness-95",
  secondary:
    "bg-primary-800 text-white shadow-e1 hover:bg-primary-900 hover:shadow-e2",
  tertiary:
    "bg-white text-primary-900 shadow-e1 hover:shadow-e2 hover:bg-darnaBg-50",
  ghost:
    "bg-transparent text-primary-800 hover:bg-primary/[0.06] hover:text-primary-900 active:bg-primary/[0.1]",
  destructive:
    "bg-red-700 text-white shadow-e1 hover:bg-red-800 hover:shadow-e2",
  confirm:
    "bg-emerald-700 text-white shadow-e1 hover:bg-emerald-800 hover:shadow-e2",
};

export const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-meta",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-body",
};

const iconSize: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };

/** Small circular spinner that inherits the text colour. */
export function Spinner({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("animate-spin [animation-duration:900ms]", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2.5"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Check mark that draws itself (used by Button success, Checkbox, SuccessCelebration). */
export function DrawnCheck({
  size = 16,
  className,
  strokeWidth = 2.4,
}: {
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <m.path
        d="M5 12.5l4.2 4.2L19 7"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: dur.base, ease: ease.out }}
      />
    </svg>
  );
}

function IconSlot({
  loading,
  success,
  icon,
  size,
}: {
  loading?: boolean;
  success?: boolean;
  icon?: React.ReactNode;
  size: ButtonSize;
}) {
  const state = loading
    ? "loading"
    : success
      ? "success"
      : icon
        ? "icon"
        : null;
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {state && (
        <m.span
          key={state}
          className="inline-flex shrink-0"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: dur.fast, ease: ease.out }}
        >
          {state === "loading" ? (
            <Spinner size={iconSize[size]} />
          ) : state === "success" ? (
            <DrawnCheck size={iconSize[size]} />
          ) : (
            icon
          )}
        </m.span>
      )}
    </AnimatePresence>
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    success = false,
    leadingIcon,
    trailingIcon,
    fullWidth,
    href,
    linkProps,
    className,
    children,
    type = "button",
    disabled,
    onClick,
    ...rest
  },
  ref,
) {
  const classes = cn(
    base,
    buttonVariants[variant],
    buttonSizes[size],
    fullWidth && "w-full",
    className,
  );
  const content = (
    <>
      <IconSlot
        loading={loading}
        success={success}
        icon={leadingIcon}
        size={size}
      />
      {children != null && (
        <span className="relative truncate">{children}</span>
      )}
      {trailingIcon && !loading && (
        <span className="inline-flex shrink-0">{trailingIcon}</span>
      )}
    </>
  );

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={cn(
          classes,
          "active:scale-[0.97] transition-transform duration-micro",
        )}
        aria-busy={loading || undefined}
        {...linkProps}
      >
        {content}
      </Link>
    );
  }

  return (
    <m.button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={spring.press}
      className={cn(
        classes,
        loading && "disabled:opacity-90 disabled:cursor-progress",
      )}
      {...rest}
    >
      {content}
    </m.button>
  );
});

export default Button;

/* ------------------------------------------------------------------ IconButton */

export type IconButtonVariant = "ghost" | "tertiary" | "glass" | "secondary";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends Omit<
  NativeButtonProps,
  "children" | "aria-label"
> {
  /** Required accessible name (icon-only control). */
  label: string;
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  /** For toggle buttons (e.g. save/heart). */
  pressed?: boolean;
}

const iconButtonVariants: Record<IconButtonVariant, string> = {
  ghost:
    "bg-transparent text-primary-800 hover:bg-primary/[0.07] hover:text-primary-900 active:bg-primary/[0.11]",
  tertiary: "bg-white text-primary-900 shadow-e1 hover:shadow-e2",
  glass: "glass-light text-primary-900 shadow-e2 hover:bg-white",
  secondary: "bg-primary-800 text-white shadow-e1 hover:bg-primary-900",
};

// Visual sizes; sm keeps a 44px hit area via an invisible ::before.
const iconButtonSizes: Record<IconButtonSize, string> = {
  sm: "w-9 h-9 before:absolute before:-inset-1 before:content-['']",
  md: "w-10 h-10 before:absolute before:-inset-0.5 before:content-['']",
  lg: "w-11 h-11",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      icon,
      variant = "ghost",
      size = "md",
      loading,
      pressed,
      className,
      type = "button",
      disabled,
      ...rest
    },
    ref,
  ) {
    return (
      <m.button
        ref={ref}
        type={type}
        aria-label={label}
        aria-pressed={pressed}
        aria-busy={loading || undefined}
        disabled={disabled || loading}
        whileTap={disabled ? undefined : { scale: 0.92 }}
        transition={spring.press}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full shrink-0 cursor-pointer",
          "transition-[background-color,box-shadow,color] duration-fast ease-standard",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          focusRing,
          iconButtonVariants[variant],
          iconButtonSizes[size],
          className,
        )}
        {...rest}
      >
        {loading ? <Spinner size={size === "lg" ? 18 : 16} /> : icon}
      </m.button>
    );
  },
);
