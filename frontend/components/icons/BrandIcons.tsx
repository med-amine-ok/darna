import React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number;
}

/**
 * 1. Welcome Arch Icon (replacing waving-hand emoji)
 * Stylized Moorish hospitality archway with warm radiating sunburst
 */
export const WelcomeArchIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="3" y1="21" x2="21" y2="21" stroke="currentColor" strokeWidth="1.75" />
    <path d="M5 21V12.5C5 7.8 8.1 4 12 4C15.9 4 19 7.8 19 12.5V21" stroke="currentColor" strokeWidth="1.75" />
    <path d="M8 21V13.2C8 9.8 9.8 7.2 12 7.2C14.2 7.2 16 9.8 16 13.2V21" stroke="#6B7F5B" strokeWidth="1.5" />
    <path d="M4 14.5C6 13.2 8 13.2 12 13.2C16 13.2 18 13.2 20 14.5" stroke="#D9C9B2" strokeWidth="1.25" />
    <line x1="12" y1="1" x2="12" y2="2.6" stroke="#C96F4F" strokeWidth="1.75" />
    <line x1="8.2" y1="1.8" x2="9.4" y2="3.1" stroke="#C96F4F" strokeWidth="1.5" />
    <line x1="15.8" y1="1.8" x2="14.6" y2="3.1" stroke="#C96F4F" strokeWidth="1.5" />
    <circle cx="12" cy="10.5" r="1.1" fill="#C96F4F" />
  </svg>
);

/**
 * 2. Instant Booking Icon (replacing lightning bolt emoji)
 * Geometric forward chevron-spark representing speed & immediacy
 */
export const InstantBookingIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M3.5 12H7" stroke="#D9C9B2" strokeWidth="1.75" />
    <path d="M4.5 7.5L7.5 10.5" stroke="#6B7F5B" strokeWidth="1.5" />
    <path d="M4.5 16.5L7.5 13.5" stroke="#6B7F5B" strokeWidth="1.5" />
    <path d="M9 4.5L16.5 12L9 19.5" stroke="currentColor" strokeWidth="2" />
    <path d="M12.5 4.5L17.5 9.5M12.5 19.5L17.5 14.5" stroke="#6B7F5B" strokeWidth="1.25" />
    <path d="M19.5 12L22.5 12" stroke="#C96F4F" strokeWidth="2" />
    <circle cx="16.5" cy="12" r="1.2" fill="#C96F4F" />
  </svg>
);

/**
 * 3. Request to Book / Manual Review Icon (replacing inbox/envelope emoji)
 * Geometric dossier envelope with verification seal
 */
export const RequestReviewIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="3" y="5" width="18" height="15" rx="2" stroke="currentColor" strokeWidth="1.75" />
    <path d="M3 6.5L12 13.5L21 6.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 18.5L8.5 13.5M21 18.5L15.5 13.5" stroke="#D9C9B2" strokeWidth="1.25" />
    <circle cx="12" cy="13.5" r="3.2" fill="#F8F6EE" stroke="#C96F4F" strokeWidth="1.5" />
    <path d="M10.7 13.5L11.7 14.6L13.5 12.4" stroke="#C96F4F" strokeWidth="1.5" />
  </svg>
);

/**
 * 4. Premium Star / Rosette Icon (replacing sparkle emoji and diamond star)
 * Authentic Algerian 8-pointed geometric star rosette (Khatim / Rub el Hizb)
 */
export const PremiumStarIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path
      d="M12 2.5L14.2 6.6L18.7 5.3L17.4 9.8L21.5 12L17.4 14.2L18.7 18.7L14.2 17.4L12 21.5L9.8 17.4L5.3 18.7L6.6 14.2L2.5 12L6.6 9.8L5.3 5.3L9.8 6.6Z"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <line x1="12" y1="5.5" x2="12" y2="8" stroke="#6B7F5B" strokeWidth="1.25" />
    <line x1="12" y1="18.5" x2="12" y2="16" stroke="#6B7F5B" strokeWidth="1.25" />
    <line x1="5.5" y1="12" x2="8" y2="12" stroke="#6B7F5B" strokeWidth="1.25" />
    <line x1="18.5" y1="12" x2="16" y2="12" stroke="#6B7F5B" strokeWidth="1.25" />
    <circle cx="12" cy="12" r="1.75" fill="#C96F4F" />
  </svg>
);

/**
 * 5. Explorer Passport Stamp: Casbah of Algiers (replacing classical building emoji)
 */
export const StampCasbahAlgiersIcon: React.FC<IconProps> = ({ size = 32, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="16" cy="16" r="14.5" stroke="#D9C9B2" strokeWidth="1.25" strokeDasharray="2 1.5" />
    <line x1="6" y1="25" x2="26" y2="25" stroke="#2E3A2F" strokeWidth="1.5" />
    <path d="M7 25V17H12V14H18V17H21V25" stroke="#2E3A2F" strokeWidth="1.5" />
    <line x1="12" y1="14" x2="12" y2="25" stroke="#6B7F5B" strokeWidth="1.2" />
    <line x1="18" y1="17" x2="18" y2="25" stroke="#6B7F5B" strokeWidth="1.2" />
    <path d="M13 25V20.5C13 19.4 13.8 18.5 15 18.5C16.2 18.5 17 19.4 17 20.5V25" stroke="#2E3A2F" strokeWidth="1.5" />
    <path d="M21 17V8H24V17" stroke="#2E3A2F" strokeWidth="1.4" />
    <path d="M20.5 8L22.5 5.5L24.5 8" stroke="#2E3A2F" strokeWidth="1.4" />
    <circle cx="22.5" cy="4.2" r="1" fill="#C96F4F" />
    <line x1="9" y1="19" x2="10" y2="19" stroke="#6B7F5B" strokeWidth="1.2" />
    <line x1="15" y1="16" x2="15" y2="16.5" stroke="#C96F4F" strokeWidth="1.5" />
  </svg>
);

/**
 * 6. Explorer Passport Stamp: Tipaza Roman Coast (replacing ocean wave emoji)
 */
export const StampTipazaCoastIcon: React.FC<IconProps> = ({ size = 32, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="16" cy="16" r="14.5" stroke="#D9C9B2" strokeWidth="1.25" strokeDasharray="2 1.5" />
    <path d="M8 9H16M7 10.5C9 10.5 9.5 11.5 9.5 12H14.5C14.5 11.5 15 10.5 17 10.5" stroke="#2E3A2F" strokeWidth="1.5" />
    <line x1="10" y1="12" x2="10" y2="20" stroke="#2E3A2F" strokeWidth="1.4" />
    <line x1="12" y1="12" x2="12" y2="20" stroke="#6B7F5B" strokeWidth="1.2" />
    <line x1="14" y1="12" x2="14" y2="20" stroke="#2E3A2F" strokeWidth="1.4" />
    <path d="M8.5 20H15.5V22H8.5Z" stroke="#2E3A2F" strokeWidth="1.4" />
    <circle cx="22" cy="11" r="2.5" stroke="#C96F4F" strokeWidth="1.5" />
    <line x1="22" y1="6.8" x2="22" y2="7.8" stroke="#C96F4F" strokeWidth="1.2" />
    <path d="M5 24C8.5 22.5 11.5 24.5 15.5 23C19.5 21.5 22.5 23.5 27 22.5" stroke="#2E3A2F" strokeWidth="1.5" />
    <path d="M7 26.5C10.5 25.5 13 27 16.5 26C20 25 23 26.5 26.5 25.5" stroke="#6B7F5B" strokeWidth="1.25" />
  </svg>
);

/**
 * 7. Explorer Passport Stamp: Oran El Bahia (replacing castle fortress emoji)
 */
export const StampOranBahiaIcon: React.FC<IconProps> = ({ size = 32, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="16" cy="16" r="14.5" stroke="#D9C9B2" strokeWidth="1.25" strokeDasharray="2 1.5" />
    <path d="M5 25.5C9 24.5 13 24 16 24C20 24 24 25 27 26" stroke="#6B7F5B" strokeWidth="1.25" />
    <path d="M8 24V14H13V17H19V12H24V24" stroke="#2E3A2F" strokeWidth="1.5" />
    <path d="M8 14H9.5V12.5H11.5V14H13" stroke="#2E3A2F" strokeWidth="1.3" />
    <path d="M19 12H20.5V10.5H22.5V12H24" stroke="#2E3A2F" strokeWidth="1.3" />
    <path d="M14.5 24V20C14.5 19 15.2 18 16 18C16.8 18 17.5 19 17.5 20V24" stroke="#2E3A2F" strokeWidth="1.4" />
    <line x1="10.5" y1="16" x2="10.5" y2="18.5" stroke="#6B7F5B" strokeWidth="1.2" />
    <line x1="21.5" y1="14.5" x2="21.5" y2="17" stroke="#6B7F5B" strokeWidth="1.2" />
    <path d="M21.5 10.5V7L25 8.5L21.5 10" stroke="#C96F4F" strokeWidth="1.3" fill="#C96F4F" />
  </svg>
);

/**
 * 8. Explorer Passport Stamp: Constantine Bridges (replacing bridge emoji)
 */
export const StampConstantineBridgesIcon: React.FC<IconProps> = ({ size = 32, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="16" cy="16" r="14.5" stroke="#D9C9B2" strokeWidth="1.25" strokeDasharray="2 1.5" />
    <path d="M5 26.5L8.5 20L7.5 13.5" stroke="#6B7F5B" strokeWidth="1.3" />
    <path d="M27 26.5L23.5 20L24.5 13.5" stroke="#6B7F5B" strokeWidth="1.3" />
    <path d="M9.5 25C10.5 19 21.5 19 22.5 25" stroke="#2E3A2F" strokeWidth="1.5" />
    <circle cx="16" cy="19" r="1.1" fill="#C96F4F" />
    <path d="M10 16V9H12.5V16" stroke="#2E3A2F" strokeWidth="1.4" />
    <path d="M19.5 16V9H22V16" stroke="#2E3A2F" strokeWidth="1.4" />
    <path d="M7.5 11C11.5 15.5 20.5 15.5 24.5 11" stroke="#2E3A2F" strokeWidth="1.3" />
    <line x1="6" y1="16" x2="26" y2="16" stroke="#2E3A2F" strokeWidth="1.5" />
    <line x1="14" y1="14" x2="14" y2="16" stroke="#6B7F5B" strokeWidth="1" />
    <line x1="16" y1="14.5" x2="16" y2="16" stroke="#6B7F5B" strokeWidth="1" />
    <line x1="18" y1="14" x2="18" y2="16" stroke="#6B7F5B" strokeWidth="1" />
  </svg>
);

/**
 * 9. Explorer Passport Stamp: Taghit Golden Oasis (replacing palm tree emoji)
 */
export const StampTaghitOasisIcon: React.FC<IconProps> = ({ size = 32, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="16" cy="16" r="14.5" stroke="#D9C9B2" strokeWidth="1.25" strokeDasharray="2 1.5" />
    <path d="M5 24.5C9.5 21 16.5 25.5 27 21" stroke="#2E3A2F" strokeWidth="1.5" />
    <path d="M11 23C16 25 21 26 27 24.5" stroke="#6B7F5B" strokeWidth="1.2" />
    <circle cx="21.5" cy="14" r="2.6" stroke="#C96F4F" strokeWidth="1.4" />
    <circle cx="21.5" cy="14" r="1" fill="#C96F4F" />
    <path d="M12 24C12.5 18 14 14.5 14.5 11.5" stroke="#2E3A2F" strokeWidth="1.6" />
    <path d="M14.5 11.5C11.5 9 7.5 10.5 6.5 13.5" stroke="#2E3A2F" strokeWidth="1.3" />
    <path d="M14.5 11.5C11.5 7.5 9.5 5 7.5 6" stroke="#2E3A2F" strokeWidth="1.3" />
    <path d="M14.5 11.5C14.5 7 15.5 5 16.5 4.5" stroke="#6B7F5B" strokeWidth="1.3" />
    <path d="M14.5 11.5C17.5 7.5 19.5 7 21.5 8.5" stroke="#2E3A2F" strokeWidth="1.3" />
    <path d="M14.5 11.5C18 10 19.5 12.5 20.5 14.5" stroke="#6B7F5B" strokeWidth="1.3" />
  </svg>
);

/**
 * 10. Explorer Passport Stamp: Tassili n'Ajjer Plateau (replacing desert plateau emoji)
 */
export const StampTassiliPlateauIcon: React.FC<IconProps> = ({ size = 32, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="16" cy="16" r="14.5" stroke="#D9C9B2" strokeWidth="1.25" strokeDasharray="2 1.5" />
    <line x1="5" y1="25" x2="27" y2="25" stroke="#2E3A2F" strokeWidth="1.5" />
    <path d="M7 25V12C7 9.5 9.5 8.5 12 8.5C16 8.5 19 9.5 21 11V25" stroke="#2E3A2F" strokeWidth="1.5" />
    <path d="M11 25V16.5C11 13 18 13 18 16.5V25" stroke="#2E3A2F" strokeWidth="1.5" />
    <line x1="7.5" y1="14.5" x2="10.5" y2="14.5" stroke="#6B7F5B" strokeWidth="1.2" />
    <line x1="7.5" y1="19.5" x2="10.5" y2="19.5" stroke="#6B7F5B" strokeWidth="1.2" />
    <line x1="18.5" y1="15" x2="21" y2="15" stroke="#6B7F5B" strokeWidth="1.2" />
    <line x1="18.5" y1="20" x2="21" y2="20" stroke="#6B7F5B" strokeWidth="1.2" />
    <path d="M21 17L25 15V25" stroke="#6B7F5B" strokeWidth="1.2" />
    <circle cx="14.5" cy="12.5" r="1.6" stroke="#C96F4F" strokeWidth="1.3" fill="#C96F4F" />
    <line x1="14.5" y1="9" x2="14.5" y2="10" stroke="#C96F4F" strokeWidth="1.2" />
  </svg>
);

/**
 * 11. Guest Favorite Medal (replacing trophy award emoji)
 */
export const GuestFavoriteIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M4 16.5C3.5 13 4.5 9 7 6" stroke="#6B7F5B" strokeWidth="1.3" />
    <path d="M3 13C4.2 12.5 5 11 5 9.5" stroke="#6B7F5B" strokeWidth="1.2" />
    <path d="M3.5 17C5 16 6 14.5 6 13" stroke="#6B7F5B" strokeWidth="1.2" />
    <path d="M20 16.5C20.5 13 19.5 9 17 6" stroke="#6B7F5B" strokeWidth="1.3" />
    <path d="M21 13C19.8 12.5 19 11 19 9.5" stroke="#6B7F5B" strokeWidth="1.2" />
    <path d="M20.5 17C19 16 18 14.5 18 13" stroke="#6B7F5B" strokeWidth="1.2" />
    <circle cx="12" cy="11.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M9.5 16.5L8.5 21L12 19.5L15.5 21L14.5 16.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M12 8L13 10.5L15.5 10.5L13.5 12L14.5 14.5L12 13L9.5 14.5L10.5 12L8.5 10.5L11 10.5Z" stroke="#C96F4F" strokeWidth="1.2" fill="#C96F4F" />
  </svg>
);

/**
 * 12. Wallet Warning Icon (replacing warning alert emoji)
 */
export const WalletWarningIcon: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M10.3 3.8C11 2.5 13 2.5 13.7 3.8L21.3 17.5C22 18.8 21 20.5 19.5 20.5H4.5C3 20.5 2 18.8 2.7 17.5L10.3 3.8Z" stroke="#C96F4F" strokeWidth="1.75" />
    <line x1="12" y1="8.5" x2="12" y2="13.5" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="17" r="1.1" fill="currentColor" />
  </svg>
);

/**
 * 13. Wallet Solvent Icon (replacing checkmark solvent indicator)
 */
export const WalletSolventIcon: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="9" stroke="#6B7F5B" strokeWidth="1.75" />
    <path d="M8 12L10.8 15L16 9" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="5.2" r="0.9" fill="#C96F4F" />
  </svg>
);

/**
 * 14. Brand Star Icon (replacing unicode star character)
 */
export const BrandStarIcon: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path
      d="M12 2.5L14.9 8.5L21.5 9.4L16.7 14.1L17.8 20.7L12 17.6L6.2 20.7L7.3 14.1L2.5 9.4L9.1 8.5L12 2.5Z"
      stroke="#C96F4F"
      strokeWidth="1.75"
      fill="#C96F4F"
    />
  </svg>
);

/**
 * Central dictionary mapping passport stamp IDs to their respective React icons
 */
export const passportStampIcons: Record<string, React.FC<IconProps>> = {
  algiers: StampCasbahAlgiersIcon,
  tipaza: StampTipazaCoastIcon,
  oran: StampOranBahiaIcon,
  constantine: StampConstantineBridgesIcon,
  taghit: StampTaghitOasisIcon,
  djanet: StampTassiliPlateauIcon,
};

/**
 * Central dictionary mapping passport stamp IDs to their raw SVG asset URLs
 */
export const passportStampUrls: Record<string, string> = {
  algiers: "/icons/stamp-casbah-algiers.svg",
  tipaza: "/icons/stamp-tipaza-coast.svg",
  oran: "/icons/stamp-oran-bahia.svg",
  constantine: "/icons/stamp-constantine-bridges.svg",
  taghit: "/icons/stamp-taghit-oasis.svg",
  djanet: "/icons/stamp-tassili-plateau.svg",
};

/**
 * 15. Brand Explore / Search Icon
 * Geometric vision lens with Moorish handle
 */
export const BrandSearchIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="10.5" cy="10.5" r="7" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M10.5 7.5L11.2 9.5L13.2 10.2L11.2 10.9L10.5 12.9L9.8 10.9L7.8 10.2L9.8 9.5Z" fill="#C96F4F" opacity="0.85" />
    <path d="M15.5 15.5L20.5 20.5" stroke="currentColor" strokeWidth={Number(strokeWidth) + 0.2} />
    <path d="M18.5 20.5L20.5 18.5" stroke="#6B7F5B" strokeWidth={strokeWidth} />
  </svg>
);

/**
 * 16. Brand Wishlists / Heart Icon
 * Geometric Moorish heart contour with subtle cleft accent
 */
export const BrandHeartIcon: React.FC<IconProps & { filled?: boolean }> = ({
  size = 20,
  strokeWidth = 1.8,
  className = "",
  filled,
  fill,
  ...props
}) => {
  const isFilled =
    filled ||
    fill === "currentColor" ||
    (typeof className === "string" && className.includes("fill-accent")) ||
    (fill && fill !== "none" && fill !== "transparent");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isFilled ? (fill || "currentColor") : "none"}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path
        d="M12 21.2L10.6 19.9C5.4 15.2 2 12.1 2 8.2C2 5 4.5 2.5 7.7 2.5C9.5 2.5 11.2 3.4 12 4.7C12.8 3.4 14.5 2.5 16.3 2.5C19.5 2.5 22 5 22 8.2C22 12.1 18.6 15.2 13.4 19.9L12 21.2Z"
        fill={isFilled ? (fill || "currentColor") : "none"}
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      {!isFilled && <circle cx="12" cy="7.5" r="1.1" fill="#C96F4F" opacity="0.9" />}
    </svg>
  );
};

/**
 * 17. Brand Trips / Astrolabe Compass Icon
 * Astrolabe dial with 8-pointed star needle
 */
export const BrandCompassIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="12" y1="2.5" x2="12" y2="4.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="12" y1="19.5" x2="12" y2="21.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="2.5" y1="12" x2="4.5" y2="12" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="19.5" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth={strokeWidth} />
    <polygon points="12,5.5 14,12 12,10.5" fill="#C96F4F" stroke="#C96F4F" strokeWidth="0.5" />
    <polygon points="12,5.5 10,12 12,10.5" fill="none" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.6} />
    <polygon points="12,18.5 14,12 12,13.5" fill="none" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.6} />
    <polygon points="12,18.5 10,12 12,13.5" fill="#6B7F5B" stroke="#6B7F5B" strokeWidth="0.5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

/**
 * 18. Brand Messages / Chat Icon
 * Moorish arch speech bubble portal with communication rhythm dots
 */
export const BrandMessageIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path
      d="M4 18V7C4 4.5 6.5 3 12 3C17.5 3 20 4.5 20 7V14C20 16.5 17.5 18 12 18H8L4 21V18Z"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    />
    <circle cx="8.5" cy="10.5" r="1.1" fill="#6B7F5B" />
    <circle cx="12" cy="10.5" r="1.3" fill="#C96F4F" />
    <circle cx="15.5" cy="10.5" r="1.1" fill="#6B7F5B" />
  </svg>
);

/**
 * 19. Brand User / Profile Icon
 * Dignified geometric silhouette with Moorish arch neckline
 */
export const BrandUserIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="7.5" r="4" stroke="currentColor" strokeWidth={strokeWidth} />
    <path
      d="M4 20.5C4 16.5 7.5 14.5 12 14.5C16.5 14.5 20 16.5 20 20.5"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    />
    <path d="M10.2 14.5C10.8 15.6 12 16.2 13.8 14.5" stroke="#C96F4F" strokeWidth="1.4" />
  </svg>
);

/**
 * 20. Brand Bell / Notification Icon
 * Moorish lantern/bell with flared rim and clapper dot
 */
export const BrandBellIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M12 3V4" stroke="currentColor" strokeWidth={strokeWidth} />
    <path
      d="M18 16.5C16.8 15 16.5 11.5 16.5 8.5C16.5 6 14.5 4 12 4C9.5 4 7.5 6 7.5 8.5C7.5 11.5 7.2 15 6 16.5H18Z"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    />
    <path d="M10 18.5C10.5 19.8 11.2 20.5 12 20.5C12.8 20.5 13.5 19.8 14 18.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="18.5" r="1.1" fill="#C96F4F" />
  </svg>
);

/**
 * 21. Brand Filter / Adjust Icon
 * Geometric sliders with diamond stops
 */
export const BrandFilterIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.85} />
    <polygon points="8,3.5 10.5,6 8,8.5 5.5,6" fill="#C96F4F" stroke="currentColor" strokeWidth="1.2" />
    <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.85} />
    <polygon points="16,9.5 18.5,12 16,14.5 13.5,12" fill="currentColor" stroke="currentColor" strokeWidth="1.2" />
    <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.85} />
    <polygon points="11,15.5 13.5,18 11,20.5 8.5,18" fill="#6B7F5B" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

/**
 * 22. Brand Share Icon
 * Geometric hospitality branch nodes
 */
export const BrandShareIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="8.5" y1="13.5" x2="15.5" y2="17.5" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.9} />
    <line x1="8.5" y1="10.5" x2="15.5" y2="6.5" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.9} />
    <circle cx="6.5" cy="12" r="3" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.9} />
    <circle cx="17.5" cy="5.5" r="3" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.9} />
    <circle cx="17.5" cy="5.5" r="1.1" fill="#C96F4F" />
    <circle cx="17.5" cy="18.5" r="3" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.9} />
    <circle cx="17.5" cy="18.5" r="1.1" fill="#6B7F5B" />
  </svg>
);

/**
 * 23. Brand Menu / Hamburger Icon
 * Staggered Moorish lintel bars with terracotta diamond terminal
 */
export const BrandMenuIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="3.5" y1="6.5" x2="20.5" y2="6.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="3.5" y1="12" x2="16.5" y2="12" stroke="currentColor" strokeWidth={strokeWidth} />
    <polygon points="18.5,12 20,10.7 21.5,12 20,13.3" fill="#C96F4F" stroke="#C96F4F" strokeWidth="0.5" />
    <line x1="3.5" y1="17.5" x2="20.5" y2="17.5" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

/**
 * 24. Brand Calendar Icon
 * Geometric tablet with date matrix and active terracotta day
 */
export const BrandCalendarIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.85} />
    <line x1="8" y1="2.5" x2="8" y2="5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="16" y1="2.5" x2="16" y2="5" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="8" cy="13.5" r="1.1" fill="currentColor" />
    <circle cx="12" cy="13.5" r="1.1" fill="currentColor" />
    <circle cx="16" cy="13.5" r="1.3" fill="#C96F4F" />
    <circle cx="8" cy="17" r="1.1" fill="currentColor" />
    <circle cx="12" cy="17" r="1.1" fill="currentColor" />
    <circle cx="16" cy="17" r="1.1" fill="currentColor" />
  </svg>
);

/**
 * 25. Brand Tag / Price Icon
 * Faceted tag with terracotta eyelet
 */
export const BrandTagIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path
      d="M12.5 2.5H6.5C4.8 2.5 3.5 3.8 3.5 5.5V11.5L13.5 21.5L21.5 13.5L12.5 2.5Z"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    />
    <circle cx="7.5" cy="6.5" r="1.5" fill="#C96F4F" />
  </svg>
);

/**
 * 26. Brand Shield / Verified Icon
 * Moorish arch shield with verification checkmark
 */
export const BrandShieldIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path
      d="M12 2.5L19.5 5.5V11.5C19.5 16.5 16 20.2 12 21.5C8 20.2 4.5 16.5 4.5 11.5V5.5L12 2.5Z"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    />
    <path d="M9 11.5L11.5 14L15.5 9.5" stroke="currentColor" strokeWidth={Number(strokeWidth) * 1.1} />
    <circle cx="12" cy="4" r="0.8" fill="#C96F4F" />
  </svg>
);

/**
 * 27. Brand Globe / Internationalization Icon
 * Astrolabe globe with equatorial ring and meridian star
 */
export const BrandGlobeIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="2.5" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth={strokeWidth} />
    <ellipse cx="12" cy="12" rx="5" ry="9.5" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.85} />
    <circle cx="12" cy="12" r="1.3" fill="#C96F4F" />
  </svg>
);

/**
 * 28. Brand Home / Today Icon
 * Moorish riad facade with keyhole archway and welcoming sun
 */
export const BrandHomeIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M3 10.5L12 3L21 10.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M5.5 9.5V20.5H18.5V9.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M9.5 20.5V14.5C9.5 13 10.5 12 12 12C13.5 12 14.5 13 14.5 14.5V20.5" stroke="#6B7F5B" strokeWidth="1.5" />
    <circle cx="12" cy="7.5" r="1.1" fill="#C96F4F" />
  </svg>
);

/**
 * 29. Brand Grid / Listings Icon
 * 4-tile zellij geometric layout grid with brand accents
 */
export const BrandGridIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="7" cy="7" r="1" fill="#C96F4F" />
    <circle cx="17" cy="17" r="1" fill="#6B7F5B" />
  </svg>
);

/**
 * 30. Brand Bookings Icon
 * Calendar tablet with checkmark confirmation
 */
export const BrandBookingsIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.85} />
    <line x1="8" y1="2.5" x2="8" y2="5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="16" y1="2.5" x2="16" y2="5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M8.5 15L11 17.5L16 12.5" stroke="#C96F4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 31. Brand Briefcase / Travel Icon
 * Classic traveler leather valise with brass stud
 */
export const BrandBriefcaseIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="3.5" y="7" width="17" height="13.5" rx="2.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M8.5 7V4.5C8.5 3.7 9.2 3 10 3H14C14.8 3 15.5 3.7 15.5 4.5V7" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="3.5" y1="12" x2="20.5" y2="12" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.85} />
    <line x1="8.5" y1="7" x2="8.5" y2="20.5" stroke="#6B7F5B" strokeWidth="1.25" />
    <line x1="15.5" y1="7" x2="15.5" y2="20.5" stroke="#6B7F5B" strokeWidth="1.25" />
    <circle cx="12" cy="12" r="1.2" fill="#C96F4F" />
  </svg>
);

/**
 * 32. Brand Settings / Preferences Icon
 * Moorish star gear mechanism
 */
export const BrandSettingsIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth={strokeWidth} />
    <path
      d="M12 2V4.5M12 19.5V22M2 12H4.5M19.5 12H22M4.9 4.9L6.7 6.7M17.3 17.3L19.1 19.1M4.9 19.1L6.7 17.3M17.3 6.7L19.1 4.9"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    />
    <circle cx="12" cy="12" r="1.5" fill="#C96F4F" />
  </svg>
);

/**
 * 33. Brand Building / Agency Icon
 * Moorish palace facade with colonnade
 */
export const BrandBuildingIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M4 21V5.5C4 4.5 4.8 3.5 5.8 3.5H18.2C19.2 3.5 20 4.5 20 5.5V21" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="2" y1="21" x2="22" y2="21" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M9.5 21V16C9.5 14.8 10.6 14 12 14C13.4 14 14.5 14.8 14.5 16V21" stroke="#6B7F5B" strokeWidth="1.5" />
    <line x1="7.5" y1="8" x2="9.5" y2="8" stroke="currentColor" strokeWidth="1.5" />
    <line x1="14.5" y1="8" x2="16.5" y2="8" stroke="currentColor" strokeWidth="1.5" />
    <line x1="7.5" y1="12" x2="9.5" y2="12" stroke="currentColor" strokeWidth="1.5" />
    <line x1="14.5" y1="12" x2="16.5" y2="12" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="6" r="1" fill="#C96F4F" />
  </svg>
);

/**
 * 34. Brand Users / Team Icon
 * Dual hospitality silhouettes
 */
export const BrandUsersIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M2.5 19.5C2.5 16 5.5 14.5 9 14.5C12.5 14.5 15.5 16 15.5 19.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M14.5 5C15.8 5.5 16.8 6.8 16.8 8.2C16.8 9.7 15.8 11 14.5 11.5" stroke="#6B7F5B" strokeWidth={Number(strokeWidth) * 0.9} />
    <path d="M16.5 14.5C18.8 15.2 20.5 16.8 20.5 19.5" stroke="#6B7F5B" strokeWidth={Number(strokeWidth) * 0.9} />
    <circle cx="9" cy="14.5" r="0.9" fill="#C96F4F" />
  </svg>
);

/**
 * 35. Brand Plus / Create Icon
 * Precise geometric plus with terracotta diamond core
 */
export const BrandPlusIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth={strokeWidth} />
    <polygon points="12,10.2 13.8,12 12,13.8 10.2,12" fill="#C96F4F" stroke="#C96F4F" strokeWidth="0.5" />
  </svg>
);

/**
 * 36. Brand More / Horizontal Dots Icon
 * Elegant triple terminal dots with terracotta central diamond
 */
export const BrandMoreIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="5" cy="12" r="1.8" fill="currentColor" />
    <polygon points="12,9.8 14.2,12 12,14.2 9.8,12" fill="#C96F4F" />
    <circle cx="19" cy="12" r="1.8" fill="currentColor" />
  </svg>
);

/**
 * 37. Brand Map Icon
 * Folded expedition parchment with terracotta center landmark
 */
export const BrandMapIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M9 18.5L3 15.5V4.5L9 7.5L15 4.5L21 7.5V18.5L15 15.5L9 18.5Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="9" y1="7.5" x2="9" y2="18.5" stroke="#6B7F5B" strokeWidth={strokeWidth} />
    <line x1="15" y1="4.5" x2="15" y2="15.5" stroke="#6B7F5B" strokeWidth={strokeWidth} />
    <circle cx="12" cy="11.5" r="1.3" fill="#C96F4F" />
  </svg>
);

/**
 * 38. Brand List Icon
 * Curated catalog list with terracotta lead marker
 */
export const BrandListIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="8.5" y1="6" x2="20.5" y2="6" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="8.5" y1="12" x2="20.5" y2="12" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="8.5" y1="18" x2="20.5" y2="18" stroke="currentColor" strokeWidth={strokeWidth} />
    <polygon points="4.5,4.8 6.2,6 4.5,7.2 2.8,6" fill="#C96F4F" />
    <circle cx="4.5" cy="12" r="1.3" fill="currentColor" />
    <circle cx="4.5" cy="18" r="1.3" fill="#6B7F5B" />
  </svg>
);

/**
 * 39. Brand Check / Done Icon
 */
export const BrandCheckIcon: React.FC<IconProps> = ({ size = 16, strokeWidth = 2, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M4 12.5L9.5 18L20 6" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

/**
 * 40. Brand Double Check Icon (Read receipt)
 */
export const BrandCheckDoubleIcon: React.FC<IconProps> = ({ size = 16, strokeWidth = 2, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M2 12.5L7.5 18L18 6" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M8 12.5L13.5 18L23 6" stroke="#C96F4F" strokeWidth={strokeWidth} />
  </svg>
);

/**
 * 41. Brand Send Icon
 * Forward message spark
 */
export const BrandSendIcon: React.FC<IconProps> = ({ size = 18, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M21.5 2.5L10 14" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M21.5 2.5L14.5 21.5L10 14L2.5 9.5L21.5 2.5Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="10" cy="14" r="1" fill="#C96F4F" />
  </svg>
);

/**
 * 42. Brand Paperclip / Attachment Icon
 */
export const BrandPaperclipIcon: React.FC<IconProps> = ({ size = 18, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path
      d="M19.5 11.5L10.5 20.5C8.8 22.2 6 22.2 4.3 20.5C2.6 18.8 2.6 16 4.3 14.3L13.3 5.3C14.4 4.2 16.2 4.2 17.3 5.3C18.4 6.4 18.4 8.2 17.3 9.3L8.8 17.8C8.3 18.3 7.4 18.3 6.9 17.8C6.4 17.3 6.4 16.4 6.9 15.9L14.9 7.9"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    />
  </svg>
);

/**
 * 43. Brand Location Pin Icon (replacing /assets/location.png and generic map pins)
 * Authentic Moorish minaret/dome pin with terracotta center jewel
 */
export const BrandPinIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path
      d="M12 21.5C12 21.5 19 14.5 19 9.5C19 5.6 15.9 2.5 12 2.5C8.1 2.5 5 5.6 5 9.5C5 14.5 12 21.5 12 21.5Z"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    />
    <circle cx="12" cy="9.5" r="3" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="12" cy="9.5" r="1.3" fill="#C96F4F" />
  </svg>
);

/**
 * 44. Brand Close / Dismiss Icon
 * Clean geometric Moorish cross with central diamond accent
 */
export const BrandCloseIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="18.5" y1="5.5" x2="5.5" y2="18.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <polygon points="12,10.6 13.4,12 12,13.4 10.6,12" fill="#C96F4F" stroke="#C96F4F" strokeWidth="0.5" />
  </svg>
);

/**
 * 45. Brand Chevron Left Icon
 */
export const BrandChevronLeftIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <polyline points="15 19 8 12 15 5" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

/**
 * 46. Brand Chevron Right Icon
 */
export const BrandChevronRightIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <polyline points="9 5 16 12 9 19" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

/**
 * 47. Brand Chevron Down Icon
 */
export const BrandChevronDownIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

/**
 * 48. Brand Chevron Up Icon
 */
export const BrandChevronUpIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <polyline points="18 15 12 9 6 15" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

/**
 * 49. Brand Minus / Counter Decrease Icon
 */
export const BrandMinusIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

/**
 * 50. Category: Villas
 * Moorish private villa facade with keyhole arch & palm accent
 */
export const CategoryVillaIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M3 20.5H21" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M4 20.5V8.5L12 3L20 8.5V20.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M9 20.5V13.5C9 12 10.2 11 12 11C13.8 11 15 12 15 13.5V20.5" stroke="#6B7F5B" strokeWidth="1.5" />
    <circle cx="12" cy="7.5" r="1.3" fill="#C96F4F" />
  </svg>
);

/**
 * 51. Category: Beachfront
 * Mediterranean sea waves with coastal morning sun
 */
export const CategoryBeachfrontIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="16.5" cy="7.5" r="3" stroke="#C96F4F" strokeWidth="1.5" />
    <circle cx="16.5" cy="7.5" r="1.2" fill="#C96F4F" />
    <path d="M3 15C5.5 13.5 8.5 15.5 11 14C13.5 12.5 16.5 14.5 21 13" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M3 19.5C6 18 9 20 12 18.5C15 17 18 19 21 17.5" stroke="#6B7F5B" strokeWidth="1.5" />
  </svg>
);

/**
 * 52. Category: Desert & Sahara
 * Grand Erg dunes and Sahara date palm
 */
export const CategoryDesertIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M2 19.5C6.5 16.5 12 20.5 22 15.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M8 18C13 19 18 19.5 22 18.5" stroke="#6B7F5B" strokeWidth="1.25" />
    <path d="M7 19.5V10C7 6 12 6 12 10V19.5" stroke="#6B7F5B" strokeWidth="1.5" />
    <path d="M7 10C5 7.5 2.5 8 2.5 8" stroke="#6B7F5B" strokeWidth="1.4" />
    <path d="M7 8C7 5 9 4 11 5" stroke="#6B7F5B" strokeWidth="1.4" />
    <circle cx="17.5" cy="7.5" r="2.5" stroke="#C96F4F" strokeWidth="1.4" />
    <circle cx="17.5" cy="7.5" r="1" fill="#C96F4F" />
  </svg>
);

/**
 * 53. Category: Historic & Riads
 * Andalusian Kasbah tower and keyhole gateway
 */
export const CategoryRiadIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M3 20.5H21" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M5 20.5V8H9V11H15V8H19V20.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M5 8H6.5V6H7.5V8H9" stroke="currentColor" strokeWidth="1.3" />
    <path d="M15 8H16.5V6H17.5V8H19" stroke="currentColor" strokeWidth="1.3" />
    <path d="M10 20.5V15C10 13.8 10.8 13 12 13C13.2 13 14 13.8 14 15V20.5" stroke="#6B7F5B" strokeWidth="1.5" />
    <circle cx="12" cy="7" r="1.1" fill="#C96F4F" />
  </svg>
);

/**
 * 54. Category: Mountain & Cedar
 * Djurdjura / Atlas mountain peaks and Atlas cedar tree
 */
export const CategoryMountainIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M2 20.5L9 6.5L16 20.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M13 15L17.5 7.5L22 20.5" stroke="#6B7F5B" strokeWidth="1.5" />
    <path d="M6.5 13L9 11L11.5 13" stroke="#D9C9B2" strokeWidth="1.4" />
    <path d="M15.5 12L17.5 10.5L19.5 12" stroke="#D9C9B2" strokeWidth="1.4" />
    <circle cx="9" cy="3.5" r="1" fill="#C96F4F" />
  </svg>
);

/**
 * 55. Category: Pools
 * Moorish riad basin with sparkling waters
 */
export const CategoryPoolIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M3 11C6.5 10 9 12 12 11C15 10 17.5 12 21 11" stroke="#6B7F5B" strokeWidth="1.5" />
    <path d="M3 15C6.5 14 9 16 12 15C15 14 17.5 16 21 15" stroke="#6B7F5B" strokeWidth="1.5" />
    <line x1="6.5" y1="5" x2="6.5" y2="10" stroke="currentColor" strokeWidth="1.4" />
    <line x1="8.5" y1="5" x2="8.5" y2="10" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="16.5" cy="8" r="1" fill="#C96F4F" />
  </svg>
);

/**
 * 56. Category: Camping & Glamping
 * Nomad pavilion tent under Saharan night sky
 */
export const CategoryCampingIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M2.5 20.5H21.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M3.5 19.5L12 4.5L20.5 19.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M12 4.5V19.5" stroke="#6B7F5B" strokeWidth="1.5" />
    <path d="M8.5 19.5L12 13.5L15.5 19.5" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="18.5" cy="7.5" r="1.3" fill="#C96F4F" />
  </svg>
);

/**
 * 57. Category: Expeditions
 * Sahara astrolabe star with discovery compass points
 */
export const CategoryExpeditionsIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path
      d="M12 2.5L14.2 7.8L19.5 6L17.7 11.3L22 12L17.7 12.7L19.5 18L14.2 16.2L12 21.5L9.8 16.2L4.5 18L6.3 12.7L2 12L6.3 11.3L4.5 6L9.8 7.8Z"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    />
    <circle cx="12" cy="12" r="2.5" stroke="#6B7F5B" strokeWidth="1.4" />
    <circle cx="12" cy="12" r="1.1" fill="#C96F4F" />
  </svg>
);

/**
 * 58. Category: Vehicles 4x4 (replacing /assets/car.png)
 * Sahara 4x4 expedition SUV line art
 */
export const CategoryVehicleIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M3 13.5V9.5C3 8.5 3.8 7.5 4.8 7.5H14.5L18.5 11.5H21C21.8 11.5 22.5 12.2 22.5 13V15.5H21" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="1.5" y1="15.5" x2="5.5" y2="15.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="7.5" cy="16.5" r="2.8" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="7.5" cy="16.5" r="1" fill="#C96F4F" />
    <line x1="10.5" y1="15.5" x2="15.5" y2="15.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="17.5" cy="16.5" r="2.8" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="17.5" cy="16.5" r="1" fill="#6B7F5B" />
    <path d="M7 8V11.5H13V8" stroke="#6B7F5B" strokeWidth="1.3" />
    <path d="M14 8V11.5H17.5L15.5 8Z" stroke="#6B7F5B" strokeWidth="1.3" />
  </svg>
);

/**
 * 59. Category / Common: House (replacing /assets/house.png)
 * Moorish architectural residence
 */
export const CategoryHouseIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M2.5 10.5L12 3L21.5 10.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M4.5 9.5V20.5H19.5V9.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M9 20.5V14.5C9 13.5 10 12.5 12 12.5C14 12.5 15 13.5 15 14.5V20.5" stroke="#6B7F5B" strokeWidth="1.5" />
    <circle cx="12" cy="7.5" r="1.1" fill="#C96F4F" />
  </svg>
);

/**
 * 60. Brand Trash / Delete Icon
 * Artisan waste container
 */
export const BrandTrashIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="3.5" y1="6" x2="20.5" y2="6" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M8.5 6V4C8.5 3.4 9 3 9.6 3H14.4C15 3 15.5 3.4 15.5 4V6" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M5.5 6L6.5 20C6.6 20.8 7.2 21.5 8 21.5H16C16.8 21.5 17.4 20.8 17.5 20L18.5 6" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="10" y1="10" x2="10" y2="17" stroke="#6B7F5B" strokeWidth="1.4" />
    <line x1="14" y1="10" x2="14" y2="17" stroke="#6B7F5B" strokeWidth="1.4" />
    <circle cx="12" cy="4.5" r="0.8" fill="#C96F4F" />
  </svg>
);

/**
 * 61. Brand Camera Icon
 * Artisan photography camera with Moorish rosette lens
 */
export const BrandCameraIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M3.5 8.5C3.5 7.4 4.4 6.5 5.5 6.5H8.2L9.6 4.5H14.4L15.8 6.5H18.5C19.6 6.5 20.5 7.4 20.5 8.5V18.5C20.5 19.6 19.6 20.5 18.5 20.5H5.5C4.4 20.5 3.5 19.6 3.5 18.5V8.5Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="12" cy="13.5" r="4" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="12" cy="13.5" r="1.5" fill="#C96F4F" />
  </svg>
);

/**
 * 62. Brand Bed / Sleeping Icon
 * Artisan hospitality bed with Moorish arched headboard
 */
export const BrandBedIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M3 7V20" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M21 11V20" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M3 15H21V18H3Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M3 11C6 11 7 8 10 8C13 8 14 11 17 11V15H3V11Z" stroke="#6B7F5B" strokeWidth="1.5" />
    <circle cx="6.5" cy="11.5" r="1.2" fill="#C96F4F" />
  </svg>
);

/**
 * 63. Brand Door / Keyhole Arch Doorway Icon
 */
export const BrandDoorIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M4 21H20" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M5.5 21V6.5C5.5 4.5 7.5 3 12 3C16.5 3 18.5 4.5 18.5 6.5V21" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="15.5" cy="13" r="1.2" fill="#C96F4F" />
    <path d="M12 7.5C10.5 7.5 9.5 8.5 9.5 10" stroke="#6B7F5B" strokeWidth="1.4" />
  </svg>
);

/**
 * 64. Brand Alert / Info Circle Icon
 */
export const BrandAlertCircleIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="12" y1="7.5" x2="12" y2="12.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="12" cy="16.5" r="1.2" fill="#C96F4F" />
  </svg>
);

/**
 * 65. Brand Clock / Time Icon
 */
export const BrandClockIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <polyline points="12 6.5 12 12 16 14" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="12" cy="12" r="1.2" fill="#C96F4F" />
  </svg>
);

/**
 * 66. Brand Flag Icon
 */
export const BrandFlagIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="4.5" y1="21.5" x2="4.5" y2="2.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M4.5 4H18.5L15.5 8.5L18.5 13H4.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="15.5" cy="8.5" r="1.1" fill="#C96F4F" />
  </svg>
);

/**
 * 67. Brand Spinner Icon
 * Artisan astrolabe circular loader with smooth continuous motion
 */
export const BrandSpinnerIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 2, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`animate-spin ${className}`}
    {...props}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={strokeWidth} strokeOpacity="0.2" />
    <path d="M12 3C16.97 3 21 7.03 21 12" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="21" cy="12" r="1.5" fill="#C96F4F" />
  </svg>
);

/**
 * 68. Brand Upload Icon
 * Archway upward dispatch with terracotta diamond arrow
 */
export const BrandUploadIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M4 16V19.5C4 20.3 4.7 21 5.5 21H18.5C19.3 21 20 20.3 20 19.5V16" stroke="currentColor" strokeWidth={strokeWidth} />
    <polyline points="16 8 12 4 8 8" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="12" y1="4" x2="12" y2="15.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <polygon points="12,2.5 13.5,4 12,5.5 10.5,4" fill="#C96F4F" stroke="#C96F4F" strokeWidth="0.5" />
  </svg>
);

/**
 * 69. Brand Eye Icon
 * Nazar-inspired geometric vision eye with terracotta iris
 */
export const BrandEyeIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M2 12C3.8 7.5 7.5 4.5 12 4.5C16.5 4.5 20.2 7.5 22 12C20.2 16.5 16.5 19.5 12 19.5C7.5 19.5 3.8 16.5 2 12Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="12" cy="12" r="1.4" fill="#C96F4F" />
  </svg>
);

/**
 * 70. Brand Eye Off Icon
 * Nazar vision eye with diagonal protective slash
 */
export const BrandEyeOffIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M9.88 9.88C9.33 10.43 9 11.18 9 12C9 13.66 10.34 15 12 15C12.82 15 13.57 14.67 14.12 14.12" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M10.73 5.08C11.15 5.03 11.57 5 12 5C16.5 5 20.2 8 22 12.5C21.27 14.33 20.1 15.91 18.61 17.09" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M6.61 6.61C4.62 7.97 3.03 9.92 2 12.5C3.8 17 7.5 20 12 20C13.68 20 15.28 19.53 16.71 18.71" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="3" y1="3" x2="21" y2="21" stroke="#C96F4F" strokeWidth={strokeWidth} />
  </svg>
);

/**
 * 71. Brand External Link Icon
 * Moorish portal with outward departure arrow
 */
export const BrandExternalLinkIcon: React.FC<IconProps> = ({ size = 18, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M18 13V19C18 20.1 17.1 21 16 21H5C3.9 21 3 20.1 3 19V8C3 6.9 3.9 6 5 6H11" stroke="currentColor" strokeWidth={strokeWidth} />
    <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="21" cy="3" r="1" fill="#C96F4F" />
  </svg>
);

/**
 * 72. Brand Receipt / Invoice Icon
 * Authentic Moorish parchment bill with decorative top and star stamp
 */
export const BrandReceiptIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M4 3H20V20L17.5 18.5L15 20L12 18.5L9 20L6.5 18.5L4 20V3Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="8" y1="7.5" x2="16" y2="7.5" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.9} />
    <line x1="8" y1="11.5" x2="16" y2="11.5" stroke="currentColor" strokeWidth={Number(strokeWidth) * 0.9} />
    <line x1="8" y1="15.5" x2="12" y2="15.5" stroke="#6B7F5B" strokeWidth={Number(strokeWidth) * 0.9} />
    <circle cx="15.5" cy="15.5" r="1.3" fill="#C96F4F" />
  </svg>
);

/**
 * 73. Brand Lock / Security Icon
 * Architectural brass padlock with keyhole
 */
export const BrandLockIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M7 10V6.5C7 4 9 2.5 12 2.5C15 2.5 17 4 17 6.5V10" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="12" cy="15" r="1.5" fill="#C96F4F" />
    <line x1="12" y1="16.5" x2="12" y2="18.5" stroke="#C96F4F" strokeWidth="1.5" />
  </svg>
);

/**
 * 74. Brand Mail / Envelope Icon
 * Hospitality folded letter with terracotta wax seal
 */
export const BrandMailIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M3 6.5L12 13L21 6.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="12" cy="13" r="1.4" fill="#C96F4F" />
  </svg>
);

/**
 * 75. Brand Phone / Smartphone Icon
 * Streamlined mobile device with Moorish indicator
 */
export const BrandPhoneIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="5.5" y="2.5" width="13" height="19" rx="3" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="10" y1="5.5" x2="14" y2="5.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="12" cy="18" r="1.2" fill="#C96F4F" />
  </svg>
);

/**
 * 76. Brand Sparkles Icon
 * Triple Algerian geometric discovery stars
 */
export const BrandSparklesIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M12 2.5L13.8 8.2L19.5 10L13.8 11.8L12 17.5L10.2 11.8L4.5 10L10.2 8.2L12 2.5Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="12" cy="10" r="1.3" fill="#C96F4F" />
    <path d="M18.5 16L19.2 18.2L21.5 19L19.2 19.8L18.5 22L17.8 19.8L15.5 19L17.8 18.2L18.5 16Z" fill="#6B7F5B" />
    <path d="M4.5 3L5.1 4.5L6.5 5.1L5.1 5.7L4.5 7L3.9 5.7L2.5 5.1L3.9 4.5L4.5 3Z" fill="#C96F4F" />
  </svg>
);

/**
 * 77. Brand Edit / Stylus Icon
 * Moorish architectural stylus quill for modifying listings & records
 */
export const BrandEditIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M12 20H21" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M16.5 3.5C17.3 2.7 18.7 2.7 19.5 3.5C20.3 4.3 20.3 5.7 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="16.5" cy="6.5" r="1" fill="#C96F4F" />
  </svg>
);

/**
 * 78. Brand Trending Up / Growth Icon
 * Upward economic trajectory line with brand star terminal
 */
export const BrandTrendingUpIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="currentColor" strokeWidth={strokeWidth} />
    <polyline points="16 7 22 7 22 13" stroke="currentColor" strokeWidth={strokeWidth} />
    <polygon points="22,7 20,8.5 20.5,10.5 22,9" fill="#C96F4F" />
  </svg>
);

/**
 * 79. Brand Arrow Right Icon
 * Directional navigation with terracotta terminal diamond
 */
export const BrandArrowRightIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth={strokeWidth} />
    <polyline points="14 6 20 12 14 18" stroke="currentColor" strokeWidth={strokeWidth} />
    <polygon points="20,12 18,10.5 16,12 18,13.5" fill="#C96F4F" />
  </svg>
);

/**
 * 80. Brand Arrow Left Icon
 */
export const BrandArrowLeftIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="20" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth={strokeWidth} />
    <polyline points="10 18 4 12 10 6" stroke="currentColor" strokeWidth={strokeWidth} />
    <polygon points="4,12 6,10.5 8,12 6,13.5" fill="#C96F4F" />
  </svg>
);

/**
 * 81. Brand Arrow Up Icon
 */
export const BrandArrowUpIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth={strokeWidth} />
    <polyline points="6 10 12 4 18 10" stroke="currentColor" strokeWidth={strokeWidth} />
    <polygon points="12,4 10.5,6 12,8 13.5,6" fill="#C96F4F" />
  </svg>
);

/**
 * 82. Brand Arrow Down Icon
 */
export const BrandArrowDownIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth={strokeWidth} />
    <polyline points="18 14 12 20 6 14" stroke="currentColor" strokeWidth={strokeWidth} />
    <polygon points="12,20 10.5,18 12,16 13.5,18" fill="#C96F4F" />
  </svg>
);

/**
 * 83. Brand WiFi Icon
 * Arched broadcast signal with terracotta origin
 */
export const BrandWifiIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M2.5 8C8.5 2.5 15.5 2.5 21.5 8" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M5.5 12C9.5 8 14.5 8 18.5 12" stroke="#6B7F5B" strokeWidth={strokeWidth} />
    <path d="M8.5 16C10.5 14 13.5 14 15.5 16" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="12" cy="19.5" r="1.5" fill="#C96F4F" />
  </svg>
);

/**
 * 84. Brand Snow / Climate AC Icon
 * Andalusian geometric 6-point ice crystal
 */
export const BrandSnowIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="3.3" y1="7" x2="20.7" y2="17" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="3.3" y1="17" x2="20.7" y2="7" stroke="currentColor" strokeWidth={strokeWidth} />
    <polyline points="10 4 12 2 14 4" stroke="#6B7F5B" strokeWidth={strokeWidth} />
    <polyline points="10 20 12 22 14 20" stroke="#6B7F5B" strokeWidth={strokeWidth} />
    <circle cx="12" cy="12" r="1.5" fill="#C96F4F" />
  </svg>
);
export const BrandAcIcon = BrandSnowIcon;

/**
 * 85. Brand Kitchen / Dining Icon
 * Mediterranean hospitality tagine cloche and cutlery
 */
export const BrandKitchenIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M3 18.5H21" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M4 18.5C4 12.5 7.5 7.5 12 7.5C16.5 7.5 20 12.5 20 18.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M12 4V7.5" stroke="#6B7F5B" strokeWidth={strokeWidth} />
    <circle cx="12" cy="3.5" r="1.5" fill="#C96F4F" />
    <line x1="8" y1="14" x2="16" y2="14" stroke="#D9C9B2" strokeWidth="1.25" />
  </svg>
);

/**
 * 86. Brand Flame / Fireplace Icon
 * Warm hearth flame with terracotta inner petal
 */
export const BrandFlameIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path
      d="M12 2.5C12 2.5 6 8.5 6 14C6 17.5 8.7 20.5 12 20.5C15.3 20.5 18 17.5 18 14C18 10 15 7.5 15 7.5C15 7.5 14.5 10.5 13 11.5C11.5 12.5 12 2.5 12 2.5Z"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    />
    <path d="M12 18.5C10.5 18.5 9.5 17 9.5 15.5C9.5 13.5 12 11.5 12 11.5C12 11.5 14.5 13.5 14.5 15.5C14.5 17 13.5 18.5 12 18.5Z" fill="#C96F4F" />
  </svg>
);

/**
 * 87. Brand Water / Sea View Icon
 * Mediterranean gentle waves
 */
export const BrandWaterIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M2.5 8.5C5.5 7 8.5 10 12 8.5C15.5 7 18.5 10 21.5 8.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M2.5 14C5.5 12.5 8.5 15.5 12 14C15.5 12.5 18.5 15.5 21.5 14" stroke="#6B7F5B" strokeWidth={strokeWidth} />
    <path d="M2.5 19.5C5.5 18 8.5 21 12 19.5C15.5 18 18.5 21 21.5 19.5" stroke="#C96F4F" strokeWidth={1.5} />
  </svg>
);

/**
 * 88. Brand Coffee / Breakfast Icon
 * Traditional artisan jezve / finjan cup
 */
export const BrandCoffeeIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M4 8H17V14C17 17 14.5 19 10.5 19C6.5 19 4 17 4 14V8Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M17 10H19C20.1 10 21 10.9 21 12C21 13.1 20.1 14 19 14H17" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="2.5" y1="21.5" x2="19" y2="21.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M8 3V5" stroke="#6B7F5B" strokeWidth={strokeWidth} />
    <path d="M12 2.5V5.5" stroke="#C96F4F" strokeWidth={strokeWidth} />
  </svg>
);

/**
 * 89. Brand Bath / Bathroom Icon
 * Hospitality tub with arched fixtures
 */
export const BrandBathIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M3 12H21V16C21 18.8 18.8 21 16 21H8C5.2 21 3 18.8 3 16V12Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M6 12V6.5C6 5.1 7.1 4 8.5 4C9.9 4 11 5.1 11 6.5V7.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="5.5" y1="21" x2="4.5" y2="23" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="18.5" y1="21" x2="19.5" y2="23" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="8.5" cy="4" r="1" fill="#C96F4F" />
  </svg>
);

/**
 * 90. Brand Sun / Sunlight Icon
 * Sahara golden sun with radiating geometric beams
 */
export const BrandSunIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="12" cy="12" r="1.5" fill="#C96F4F" />
    <line x1="12" y1="2" x2="12" y2="4.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="12" y1="19.5" x2="12" y2="22" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="2" y1="12" x2="4.5" y2="12" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="19.5" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="4.9" y1="4.9" x2="6.8" y2="6.8" stroke="#6B7F5B" strokeWidth={strokeWidth} />
    <line x1="17.2" y1="17.2" x2="19.1" y2="19.1" stroke="#6B7F5B" strokeWidth={strokeWidth} />
    <line x1="4.9" y1="19.1" x2="6.8" y2="17.2" stroke="#6B7F5B" strokeWidth={strokeWidth} />
    <line x1="17.2" y1="6.8" x2="19.1" y2="4.9" stroke="#6B7F5B" strokeWidth={strokeWidth} />
  </svg>
);

/**
 * 91. Brand Credit Card / Payment Icon
 * Edahabia / CIB bank card with golden smart chip
 */
export const BrandCreditCardIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="2.5" y1="9.5" x2="21.5" y2="9.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <rect x="5.5" y="13" width="3.5" height="2.5" rx="0.5" fill="#C96F4F" />
    <line x1="12" y1="14.5" x2="17.5" y2="14.5" stroke="#6B7F5B" strokeWidth="1.5" />
  </svg>
);

/**
 * 92. Brand Cash / Banknote Icon
 * Algerian Dinar note with central security rosette
 */
export const BrandCashIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="2.5" y="5.5" width="19" height="13" rx="2" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="12" cy="12" r="1.2" fill="#C96F4F" />
    <line x1="6" y1="9" x2="6" y2="15" stroke="#6B7F5B" strokeWidth="1.5" />
    <line x1="18" y1="9" x2="18" y2="15" stroke="#6B7F5B" strokeWidth="1.5" />
  </svg>
);

/**
 * 93. Brand Key Icon
 * Architectural brass door key with rosette handle
 */
export const BrandKeyIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="7.5" cy="14.5" r="4.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="7.5" cy="14.5" r="1.5" fill="#C96F4F" />
    <line x1="10.8" y1="11.2" x2="20.5" y2="3.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="16" y1="8" x2="18.5" y2="10" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="18.5" y1="5.5" x2="21" y2="7.5" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

/**
 * 94. Brand Thumb Up Icon
 * Algerian hospitality approval salute
 */
export const BrandThumbUpIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M7 10V21H3.5C2.7 21 2 20.3 2 19.5V11.5C2 10.7 2.7 10 3.5 10H7Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M7 10L11.5 3C12.5 3 13.5 4 13.5 5.5V8.5H19.5C20.6 8.5 21.5 9.4 21.5 10.5C21.5 10.9 21.3 11.3 21.1 11.6L18.5 18.6C18.2 19.4 17.4 20 16.5 20H7" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="13.5" cy="8.5" r="1" fill="#C96F4F" />
  </svg>
);

/**
 * 95. Brand Thumb Down Icon
 */
export const BrandThumbDownIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M7 14V3H3.5C2.7 3 2 3.7 2 4.5V12.5C2 13.3 2.7 14 3.5 14H7Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M7 14L11.5 21C12.5 21 13.5 20 13.5 18.5V15.5H19.5C20.6 15.5 21.5 14.6 21.5 13.5C21.5 13.1 21.3 12.7 21.1 12.4L18.5 5.4C18.2 4.6 17.4 4 16.5 4H7" stroke="currentColor" strokeWidth={strokeWidth} />
    <circle cx="13.5" cy="15.5" r="1" fill="#C96F4F" />
  </svg>
);

/**
 * 96. Brand Download Icon
 * Downward dispatch arrow to collection tray
 */
export const BrandDownloadIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M4 16V19.5C4 20.3 4.7 21 5.5 21H18.5C19.3 21 20 20.3 20 19.5V16" stroke="currentColor" strokeWidth={strokeWidth} />
    <polyline points="8 12 12 16 16 12" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="12" y1="4" x2="12" y2="16" stroke="currentColor" strokeWidth={strokeWidth} />
    <polygon points="12,17.5 10.5,16 12,14.5 13.5,16" fill="#C96F4F" />
  </svg>
);

/**
 * 97. Brand User Add Icon
 */
export const BrandUserAddIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="9" cy="8" r="4" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M3 20.5C3 16.5 6 14.5 9.5 14.5C13 14.5 16 16.5 16 20.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="16" y1="11" x2="22" y2="11" stroke="currentColor" strokeWidth={strokeWidth} />
    <polygon points="19,10 19.8,11 19,12 18.2,11" fill="#C96F4F" />
  </svg>
);

/**
 * 98. Brand Refresh / Sync Icon
 */
export const BrandRefreshIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M21.5 10C20.5 5.5 16.5 2.5 12 2.5C6.8 2.5 2.5 6.8 2.5 12" stroke="currentColor" strokeWidth={strokeWidth} />
    <polyline points="21.5 4 21.5 10 15.5 10" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M2.5 14C3.5 18.5 7.5 21.5 12 21.5C17.2 21.5 21.5 17.2 21.5 12" stroke="#6B7F5B" strokeWidth={strokeWidth} />
    <polyline points="2.5 20 2.5 14 8.5 14" stroke="#6B7F5B" strokeWidth={strokeWidth} />
    <circle cx="12" cy="12" r="1.2" fill="#C96F4F" />
  </svg>
);

/**
 * 99. Brand Google Icon (Auth Provider)
 */
export const BrandGoogleIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

/**
 * 100. Brand GitHub Icon (Auth Provider)
 */
export const BrandGithubIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

/**
 * 101. Brand Apple Icon (Auth Provider)
 */
export const BrandAppleIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.93 2.74 1 .08 2.02-.49 2.63-1.24z" />
  </svg>
);

/**
 * 102. Brand Ticket / Coupon Icon
 * Perforated voucher slip with brand star punch
 */
export const BrandTicketIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path
      d="M3 8.5C4.5 8.5 5.5 7.5 5.5 6H18.5C18.5 7.5 19.5 8.5 21 8.5V15.5C19.5 15.5 18.5 16.5 18.5 18H5.5C5.5 16.5 4.5 15.5 3 15.5V8.5Z"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    />
    <line x1="12" y1="6" x2="12" y2="18" stroke="#6B7F5B" strokeWidth="1.5" strokeDasharray="2 2" />
    <circle cx="8.5" cy="12" r="1.2" fill="#C96F4F" />
  </svg>
);

/**
 * 103. Brand Chart / Analytics Icon
 * Tri-column Moorish analytics chart with progress line
 */
export const BrandChartIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="3" y1="20.5" x2="21" y2="20.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <rect x="5" y="12" width="3" height="8.5" rx="1" fill="#6B7F5B" />
    <rect x="10.5" y="7" width="3" height="13.5" rx="1" fill="#2E3A2F" />
    <rect x="16" y="4" width="3" height="16.5" rx="1" fill="#C96F4F" />
  </svg>
);

/**
 * 104. Brand Ban / Restrict Icon
 */
export const BrandBanIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" stroke="#C96F4F" strokeWidth={strokeWidth} />
  </svg>
);

/**
 * 105. Brand Check Circle Icon
 */
export const BrandCheckCircleIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={strokeWidth} />
    <path d="M8 12.5L10.8 15.3L16 9" stroke="#6B7F5B" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 106. Brand Badge Check Icon (Moorish 8-point rosette with verification checkmark)
 */
export const BrandBadgeCheckIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path
      d="M12 2.5L14.7 5.2L18.5 5.5L19.5 9.2L22.5 11.5L20.8 15L21.7 18.8L18 20L15.8 23L12 21.8L8.2 23L6 20L2.3 18.8L3.2 15L1.5 11.5L4.5 9.2L5.5 5.5L9.3 5.2L12 2.5Z"
      stroke="#6B7F5B"
      strokeWidth={strokeWidth}
      fill="#F9F6F0"
    />
    <path d="M8.5 12L11 14.5L15.5 9.5" stroke="#2E3A2F" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 107. Brand Trending Down Icon
 */
export const BrandTrendingDownIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" stroke="#C96F4F" strokeWidth={strokeWidth} />
    <polyline points="16 17 22 17 22 11" stroke="#C96F4F" strokeWidth={strokeWidth} />
  </svg>
);

// Aliases for seamless drop-in replacements across the application
export const BrandAdjustmentsIcon = BrandFilterIcon;
export const BrandExclamationIcon = BrandAlertCircleIcon;
export const BrandLightningIcon = InstantBookingIcon;
export const BrandCrossIcon = BrandCloseIcon;

/**
 * 108. Brand Document Text / Contract Parchment Icon
 * Moorish architectural report parchment with folded tab, inscribed lines, and seal
 */
export const BrandDocumentTextIcon: React.FC<IconProps> = ({ size = 20, strokeWidth = 1.8, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth={strokeWidth} />
    <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth={strokeWidth} />
    <line x1="8" y1="13" x2="16" y2="13" stroke="#6B7F5B" strokeWidth={strokeWidth} />
    <line x1="8" y1="17" x2="13" y2="17" stroke="#6B7F5B" strokeWidth={strokeWidth} />
    <polygon points="16,16 17.5,17 16,18 14.5,17" fill="#C96F4F" stroke="#C96F4F" strokeWidth="0.5" />
  </svg>
);
export const BrandDocumentIcon = BrandDocumentTextIcon;


