/**
 * BLADUS component kit, import everything from "@/components/ui".
 * Docs: docs/design/COMPONENTS.md · live gallery: /<locale>/design-system (dev only).
 */

export {
  default as Button,
  IconButton,
  Spinner,
  DrawnCheck,
  buttonVariants,
  buttonSizes,
} from "./Button";
export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  IconButtonProps,
  IconButtonVariant,
  IconButtonSize,
} from "./Button";

export { Input, Textarea, Select, FieldMessages } from "./Field";
export type {
  InputProps,
  TextareaProps,
  SelectProps,
  SelectOption,
} from "./Field";

export { Checkbox, Radio, RadioGroup, Switch } from "./Choice";
export type {
  CheckboxProps,
  RadioProps,
  RadioGroupProps,
  RadioGroupOption,
  SwitchProps,
} from "./Choice";

export { Chip } from "./Chip";
export type { ChipProps } from "./Chip";
export { Badge, Pill } from "./Badge";
export type { BadgeProps, BadgeTone } from "./Badge";
export { Avatar, AvatarStack } from "./Avatar";
export type { AvatarProps, AvatarSize, AvatarStackProps } from "./Avatar";

export { Tooltip, Popover, DropdownMenu } from "./Popover";
export type {
  TooltipProps,
  PopoverProps,
  DropdownMenuProps,
  DropdownItem,
} from "./Popover";

export { Tabs, TabPanel, SegmentedControl } from "./Tabs";
export type {
  TabsProps,
  TabItem,
  TabPanelProps,
  SegmentedControlProps,
} from "./Tabs";
export { Accordion } from "./Accordion";
export type { AccordionProps, AccordionItem } from "./Accordion";
export { Breadcrumbs } from "./Breadcrumbs";
export type { BreadcrumbItem } from "./Breadcrumbs";
export { Pagination } from "./Pagination";
export type { PaginationProps } from "./Pagination";

export { Skeleton, SkeletonListingCard, SkeletonRow } from "./Skeleton";
export type { SkeletonProps } from "./Skeleton";
export { Card, Divider } from "./Surface";
export type { CardProps, CardVariant, DividerProps } from "./Surface";
export { StatCard } from "./StatCard";
export type { StatCardProps } from "./StatCard";
export { default as AnimatedNumber } from "./AnimatedNumber";
export { default as ArchImage } from "./ArchImage";
export { default as SectionHeader } from "./SectionHeader";

export {
  default as Dialog,
  DialogFooter,
  SheetHandle,
  dialogBackdrop,
} from "./Dialog";
export type { DialogProps } from "./Dialog";
export { Sheet } from "./Sheet";
export type { SheetProps } from "./Sheet";

export {
  Banner,
  ProgressBar,
  ErrorState,
  KitEmptyState,
  InlineStatus,
} from "./Feedback";
export type {
  BannerProps,
  BannerTone,
  ProgressBarProps,
  ErrorStateProps,
  KitEmptyStateProps,
} from "./Feedback";
export { Illustration } from "./Illustration";
export type { IllustrationProps, IllustrationVariant } from "./Illustration";
export { SuccessCelebration } from "./SuccessCelebration";
export type { SuccessCelebrationProps } from "./SuccessCelebration";
export { BrandLoader, TopProgressBar } from "./Loader";

export { cn, focusRing, focusRingInset } from "./cn";
export { useIsRtl, useIsPhone, useMediaQuery } from "./hooks";
