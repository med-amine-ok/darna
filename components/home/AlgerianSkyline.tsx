"use client";

import React from "react";

interface SkylineProps {
  className?: string;
}

export default function AlgerianSkyline({ className = "" }: SkylineProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-hidden w-full ${className}`}
    >
      <svg
        viewBox="0 0 1600 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax meet"
        className="w-full h-full text-accent/50 stroke-accent/60"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <defs>
          {/* Subtle linear wash so outlines stand out against background */}
          <linearGradient id="outline-ambient-wash" x1="0" y1="0" x2="0" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.08" />
            <stop offset="60%" stopColor="currentColor" stopOpacity="0.04" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="ground-gradient" x1="0" y1="0" x2="0" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* ============================================================== */}
        {/* 1. SAHARA DUNES & KSAR OF TAGHIT / M'ZAB VALLEY (x: 0 - 240)    */}
        {/* ============================================================== */}
        {/* Sand Dunes Soft Contour Lines */}
        <path d="M-20 225 Q 70 175 180 205 T 380 215" fill="none" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6" />
        <path d="M0 240 Q 90 195 210 220 T 420 230 L 420 240 L 0 240 Z" fill="url(#ground-gradient)" stroke="none" />

        {/* Date Palm 1 (Sahara Oasis) */}
        <path d="M48 238 Q 42 180 38 145" fill="none" strokeWidth="2" />
        <path d="M38 145 Q 15 135 2 150" fill="none" strokeWidth="1.5" />
        <path d="M38 145 Q 18 120 10 108" fill="none" strokeWidth="1.5" />
        <path d="M38 145 Q 36 112 34 95" fill="none" strokeWidth="1.5" />
        <path d="M38 145 Q 52 110 65 105" fill="none" strokeWidth="1.5" />
        <path d="M38 145 Q 60 128 72 142" fill="none" strokeWidth="1.5" />

        {/* Ghardaïa M'Zab Tapered Minaret (UNESCO) */}
        <path
          d="M80 238 L 92 130 L 102 130 L 114 238 Z"
          fill="url(#outline-ambient-wash)"
          strokeWidth="1.6"
        />
        {/* Four Horn Finials at summit of M'zab Minaret */}
        <path d="M92 130 L 90 118 L 94 125" fill="none" strokeWidth="1.4" />
        <path d="M95 130 L 95 116 L 97 125" fill="none" strokeWidth="1.4" />
        <path d="M99 130 L 100 116 L 101 125" fill="none" strokeWidth="1.4" />
        <path d="M102 130 L 104 118 L 101 125" fill="none" strokeWidth="1.4" />
        {/* Slit Windows */}
        <line x1="97" y1="145" x2="97" y2="155" strokeWidth="1.5" />
        <line x1="97" y1="170" x2="97" y2="182" strokeWidth="1.5" />
        <line x1="97" y1="198" x2="97" y2="210" strokeWidth="1.5" />

        {/* Taghit Adobe Ksar Battlements */}
        <path
          d="M114 238 V 195 H 135 V 205 H 145 V 195 H 165 V 205 H 175 V 190 H 205 V 238"
          fill="url(#outline-ambient-wash)"
          strokeWidth="1.5"
        />
        {/* Triangular Berber niches */}
        <polygon points="122,215 127,208 132,215" fill="none" strokeWidth="1.2" />
        <polygon points="152,215 157,208 162,215" fill="none" strokeWidth="1.2" />
        <polygon points="182,210 187,203 192,210" fill="none" strokeWidth="1.2" />

        {/* Date Palm 2 */}
        <path d="M215 238 Q 222 175 228 140" fill="none" strokeWidth="2" />
        <path d="M228 140 Q 205 130 190 142" fill="none" strokeWidth="1.5" />
        <path d="M228 140 Q 212 115 208 100" fill="none" strokeWidth="1.5" />
        <path d="M228 140 Q 235 110 248 102" fill="none" strokeWidth="1.5" />
        <path d="M228 140 Q 248 122 258 138" fill="none" strokeWidth="1.5" />

        {/* ============================================================== */}
        {/* 2. TIPAZA ROMAN RUINS & MAURETANIAN MAUSOLEUM (x: 250 - 480)   */}
        {/* ============================================================== */}
        {/* Tipaza Roman Classical Columns & Arch */}
        <g id="tipaza-ruins">
          {/* Base Pedestal */}
          <line x1="250" y1="238" x2="370" y2="238" strokeWidth="2" />
          <line x1="252" y1="233" x2="368" y2="233" strokeWidth="1.2" />

          {/* Column 1 */}
          <rect x="260" y="145" width="10" height="88" fill="url(#outline-ambient-wash)" strokeWidth="1.4" />
          {/* Capital */}
          <path d="M257 145 H 273 L 270 138 H 260 Z" fill="none" strokeWidth="1.4" />
          {/* Fluting lines */}
          <line x1="263" y1="148" x2="263" y2="230" strokeWidth="0.8" opacity="0.6" />
          <line x1="267" y1="148" x2="267" y2="230" strokeWidth="0.8" opacity="0.6" />

          {/* Column 2 */}
          <rect x="290" y="145" width="10" height="88" fill="url(#outline-ambient-wash)" strokeWidth="1.4" />
          <path d="M287 145 H 303 L 300 138 H 290 Z" fill="none" strokeWidth="1.4" />
          <line x1="293" y1="148" x2="293" y2="230" strokeWidth="0.8" opacity="0.6" />
          <line x1="297" y1="148" x2="297" y2="230" strokeWidth="0.8" opacity="0.6" />

          {/* Column 3 (Broken Ancient Pillar) */}
          <rect x="320" y="175" width="10" height="58" fill="url(#outline-ambient-wash)" strokeWidth="1.4" />
          <path d="M319 175 Q 325 170 331 175" fill="none" strokeWidth="1.4" />

          {/* Entablature Architrave Beam connecting Col 1 & 2 */}
          <rect x="254" y="130" width="54" height="8" fill="url(#outline-ambient-wash)" strokeWidth="1.4" />
          <rect x="252" y="125" width="58" height="5" fill="none" strokeWidth="1.2" />

          {/* Roman Arch of Tipaza */}
          <path
            d="M340 238 V 165 Q 365 135 390 165 V 238"
            fill="url(#outline-ambient-wash)"
            strokeWidth="1.6"
          />
          <path d="M348 238 V 170 Q 365 148 382 170 V 238" fill="none" strokeWidth="1.3" />
          {/* Keystone */}
          <polygon points="362,138 368,138 367,148 363,148" fill="none" strokeWidth="1.2" />
        </g>

        {/* Royal Mausoleum of Mauretania (Tombeau de la Chrétienne, Tipaza) */}
        <g id="royal-mausoleum" transform="translate(400, 0)">
          {/* Circular stepped pyramid profile */}
          <path
            d="M10 238 H 110 L 105 200 L 98 175 L 88 155 L 75 142 L 60 135 L 45 142 L 32 155 L 22 175 L 15 200 Z"
            fill="url(#outline-ambient-wash)"
            strokeWidth="1.6"
          />
          {/* Stepped tiers */}
          <line x1="16" y1="210" x2="104" y2="210" strokeWidth="1.2" />
          <line x1="22" y1="185" x2="98" y2="185" strokeWidth="1.2" />
          <line x1="32" y1="165" x2="88" y2="165" strokeWidth="1.2" />
          <line x1="45" y1="150" x2="75" y2="150" strokeWidth="1.2" />
          {/* Top finial stone */}
          <circle cx="60" cy="132" r="3.5" strokeWidth="1.3" />

          {/* Attached ionic columns around the drum base */}
          <line x1="25" y1="210" x2="25" y2="238" strokeWidth="1.2" />
          <line x1="40" y1="210" x2="40" y2="238" strokeWidth="1.2" />
          <line x1="60" y1="210" x2="60" y2="238" strokeWidth="1.2" />
          <line x1="80" y1="210" x2="80" y2="238" strokeWidth="1.2" />
          <line x1="95" y1="210" x2="95" y2="238" strokeWidth="1.2" />
        </g>

        {/* Santa Cruz Fort Tower (Oran) */}
        <g id="santa-cruz" transform="translate(525, 0)">
          <path
            d="M10 238 L 18 160 H 46 L 54 238 Z"
            fill="url(#outline-ambient-wash)"
            strokeWidth="1.5"
          />
          {/* Crenellations */}
          <path d="M14 160 V 150 H 22 V 155 H 28 V 150 H 36 V 155 H 42 V 150 H 50 V 160" fill="none" strokeWidth="1.4" />
          {/* Watchtower Dome */}
          <path d="M25 150 Q 32 135 39 150" fill="none" strokeWidth="1.4" />
          {/* Arched Window */}
          <path d="M28 185 Q 32 178 36 185 V 200 H 28 Z" fill="none" strokeWidth="1.2" />
        </g>

        {/* Moorish Arcade Row Transition */}
        <g id="casbah-arcade" transform="translate(585, 0)">
          <path d="M10 238 V 190 Q 25 172 40 190 V 238 H 32 V 194 Q 25 182 18 194 V 238 Z" fill="url(#outline-ambient-wash)" strokeWidth="1.4" />
          <path d="M45 238 V 190 Q 60 172 75 190 V 238 H 67 V 194 Q 60 182 53 194 V 238 Z" fill="url(#outline-ambient-wash)" strokeWidth="1.4" />
        </g>

        {/* ============================================================== */}
        {/* 3. CENTERPIECE: MAQAM ECHAHID (Monument of Martyrs, Algiers)   */}
        {/* ============================================================== */}
        <g id="maqam-echahid" transform="translate(680, 0)">
          {/* Base Ceremonial Stepped Esplanade */}
          <polygon points="20,238 220,238 200,225 40,225" fill="url(#outline-ambient-wash)" strokeWidth="1.4" />
          <line x1="50" y1="230" x2="190" y2="230" strokeWidth="1" opacity="0.6" />

          {/* Central Dome under the Monument */}
          <path d="M100 225 Q 120 205 140 225" fill="none" strokeWidth="1.5" />

          {/* --- The Three Soaring Concrete Palm Leaves (Palmes) --- */}
          
          {/* Left Soaring Palm Leaf */}
          <path
            d="M65 225 C 68 180 82 120 102 75 C 112 52 118 35 120 22 C 117 38 111 60 102 90 C 90 130 80 180 82 225 Z"
            fill="url(#outline-ambient-wash)"
            strokeWidth="1.8"
          />
          {/* Left Palm Ridge Contour Line */}
          <path d="M74 225 C 76 180 88 130 105 85 C 112 65 116 48 119 28" fill="none" strokeWidth="1.1" opacity="0.7" />

          {/* Right Soaring Palm Leaf */}
          <path
            d="M175 225 C 172 180 158 120 138 75 C 128 52 122 35 120 22 C 123 38 129 60 138 90 C 150 130 160 180 158 225 Z"
            fill="url(#outline-ambient-wash)"
            strokeWidth="1.8"
          />
          {/* Right Palm Ridge Contour Line */}
          <path d="M166 225 C 164 180 152 130 135 85 C 128 65 124 48 121 28" fill="none" strokeWidth="1.1" opacity="0.7" />

          {/* Center Vertical Structural Leaf */}
          <path
            d="M115 225 C 116 160 117 95 119 24 C 121 95 122 160 125 225 Z"
            fill="url(#outline-ambient-wash)"
            strokeWidth="1.6"
          />

          {/* Top Turret Assembly (Observation Deck & Lantern) */}
          <rect x="114" y="16" width="12" height="7" rx="1" fill="url(#outline-ambient-wash)" strokeWidth="1.5" />
          <path d="M114 16 L 120 8 L 126 16 Z" fill="none" strokeWidth="1.5" />
          {/* Spire & Eternal Flame Beacon */}
          <line x1="120" y1="8" x2="120" y2="2" strokeWidth="1.5" />
          <circle cx="120" cy="1" r="1.5" fill="currentColor" stroke="none" />
        </g>

        {/* ============================================================== */}
        {/* 4. DJAMAA EL DJAZAÏR & CASBAH OF ALGIERS (x: 910 - 1200)       */}
        {/* ============================================================== */}
        {/* Grand Mosque Minaret (World's Tallest Minaret - 265m) */}
        <g id="great-mosque-minaret" transform="translate(920, 0)">
          {/* Minaret Main Shaft */}
          <rect
            x="20"
            y="28"
            width="34"
            height="210"
            fill="url(#outline-ambient-wash)"
            strokeWidth="1.8"
          />
          {/* Geometric Mashrabiya Lattice Window Tiers */}
          {/* Tier 1 */}
          <rect x="27" y="45" width="20" height="22" rx="1" fill="none" strokeWidth="1.2" />
          <path d="M27 55 Q 37 47 47 55" fill="none" strokeWidth="1" />
          <line x1="37" y1="48" x2="37" y2="67" strokeWidth="1" />

          {/* Tier 2 */}
          <rect x="27" y="78" width="20" height="22" rx="1" fill="none" strokeWidth="1.2" />
          <path d="M27 88 Q 37 80 47 88" fill="none" strokeWidth="1" />
          <line x1="37" y1="81" x2="37" y2="100" strokeWidth="1" />

          {/* Tier 3 */}
          <rect x="27" y="112" width="20" height="22" rx="1" fill="none" strokeWidth="1.2" />
          <path d="M27 122 Q 37 114 47 122" fill="none" strokeWidth="1" />
          <line x1="37" y1="115" x2="37" y2="134" strokeWidth="1" />

          {/* Tier 4 */}
          <rect x="27" y="146" width="20" height="22" rx="1" fill="none" strokeWidth="1.2" />
          <path d="M27 156 Q 37 148 47 156" fill="none" strokeWidth="1" />
          <line x1="37" y1="149" x2="37" y2="168" strokeWidth="1" />

          {/* Tier 5 */}
          <rect x="27" y="180" width="20" height="22" rx="1" fill="none" strokeWidth="1.2" />
          <path d="M27 190 Q 37 182 47 190" fill="none" strokeWidth="1" />
          <line x1="37" y1="183" x2="37" y2="202" strokeWidth="1" />

          {/* Top Gallery & Balcony */}
          <line x1="16" y1="28" x2="58" y2="28" strokeWidth="2" />
          <rect x="25" y="16" width="24" height="12" fill="url(#outline-ambient-wash)" strokeWidth="1.4" />
          {/* Pyramid Cap & Spire with Golden Jamur Crescent */}
          <path d="M25 16 L 37 4 L 49 16 Z" fill="none" strokeWidth="1.5" />
          <line x1="37" y1="4" x2="37" y2="-3" strokeWidth="1.5" />
          <circle cx="37" cy="-5" r="2" fill="none" strokeWidth="1.2" />
        </g>

        {/* Grand Mosque Ribbed Dome (Coupe de Djamaa el Djazaïr) */}
        <g id="great-mosque-dome" transform="translate(980, 0)">
          {/* Drum with 12 arched clerestory windows */}
          <rect x="0" y="155" width="105" height="83" fill="url(#outline-ambient-wash)" strokeWidth="1.6" />
          <path d="M12 170 Q 20 160 28 170 V 185 H 12 Z" fill="none" strokeWidth="1.2" />
          <path d="M38 170 Q 46 160 54 170 V 185 H 38 Z" fill="none" strokeWidth="1.2" />
          <path d="M64 170 Q 72 160 80 170 V 185 H 64 Z" fill="none" strokeWidth="1.2" />
          <path d="M90 170 Q 98 160 106 170 V 185 H 90 Z" fill="none" strokeWidth="1.2" />

          {/* The Ribbed Hemispherical Dome */}
          <path
            d="M0 155 Q 52 75 105 155 Z"
            fill="url(#outline-ambient-wash)"
            strokeWidth="1.8"
          />
          {/* Structural Dome Ribs */}
          <path d="M52 75 C 52 105 52 135 52 155" fill="none" strokeWidth="1.2" />
          <path d="M52 75 C 32 95 18 125 15 155" fill="none" strokeWidth="1.1" />
          <path d="M52 75 C 72 95 86 125 89 155" fill="none" strokeWidth="1.1" />
          {/* Lantern and Spire */}
          <rect x="48" y="70" width="8" height="6" fill="none" strokeWidth="1.2" />
          <line x1="52" y1="70" x2="52" y2="60" strokeWidth="1.4" />
          <circle cx="52" cy="58" r="2.5" fill="none" strokeWidth="1.2" />
        </g>

        {/* Casbah Stepped Terraced Houses */}
        <g id="casbah-houses" transform="translate(1095, 0)">
          {/* House 1 (Upper Terrace) */}
          <path
            d="M5 238 V 140 H 55 V 238"
            fill="url(#outline-ambient-wash)"
            strokeWidth="1.5"
          />
          {/* Wooden corbels (khorja) */}
          <line x1="5" y1="140" x2="55" y2="140" strokeWidth="2" />
          <polygon points="8,140 12,148 16,140" fill="currentColor" stroke="none" opacity="0.6" />
          <polygon points="24,140 28,148 32,140" fill="currentColor" stroke="none" opacity="0.6" />
          <polygon points="40,140 44,148 48,140" fill="currentColor" stroke="none" opacity="0.6" />
          {/* Mashrabiya Arched Window */}
          <path d="M22 165 Q 30 156 38 165 V 180 H 22 Z" fill="none" strokeWidth="1.2" />
          <line x1="30" y1="160" x2="30" y2="180" strokeWidth="1" />
          {/* Traditional Doorway with Horseshoe Arch */}
          <path d="M22 238 V 205 Q 30 196 38 205 V 238" fill="none" strokeWidth="1.4" />

          {/* House 2 (Lower Terrace) */}
          <path
            d="M55 238 V 160 H 105 V 238"
            fill="url(#outline-ambient-wash)"
            strokeWidth="1.5"
          />
          <path d="M72 185 Q 80 176 88 185 V 200 H 72 Z" fill="none" strokeWidth="1.2" />
          {/* Pergola on Roof */}
          <line x1="60" y1="160" x2="60" y2="150" strokeWidth="1.2" />
          <line x1="75" y1="160" x2="75" y2="150" strokeWidth="1.2" />
          <line x1="90" y1="160" x2="90" y2="150" strokeWidth="1.2" />
          <line x1="56" y1="150" x2="96" y2="150" strokeWidth="1.5" />
        </g>

        {/* ============================================================== */}
        {/* 5. CONSTANTINE BRIDGES & SIDI M'CID SUSPENSION (x: 1200 - 1600)*/}
        {/* ============================================================== */}
        <g id="constantine-bridge" transform="translate(1210, 0)">
          {/* Natural Rhumel Canyon Gorge Rocks Left */}
          <path
            d="M0 238 Q 15 200 20 180 Q 25 150 40 145 V 238"
            fill="url(#outline-ambient-wash)"
            strokeWidth="1.5"
          />
          {/* Geological Rock Stratum Lines */}
          <path d="M5 210 Q 18 190 25 170" fill="none" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          <path d="M8 230 Q 25 215 35 195" fill="none" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

          {/* Suspension Bridge Tower 1 (Left Pylon) */}
          <rect x="40" y="85" width="14" height="153" fill="url(#outline-ambient-wash)" strokeWidth="1.6" />
          <path d="M38 85 H 56 L 47 70 Z" fill="none" strokeWidth="1.5" />
          {/* Pylon Arch opening */}
          <path d="M43 140 Q 47 125 51 140 V 165 H 43 Z" fill="none" strokeWidth="1.2" />

          {/* Suspension Bridge Tower 2 (Right Pylon) */}
          <rect x="195" y="85" width="14" height="153" fill="url(#outline-ambient-wash)" strokeWidth="1.6" />
          <path d="M193 85 H 211 L 202 70 Z" fill="none" strokeWidth="1.5" />
          <path d="M198 140 Q 202 125 206 140 V 165 H 198 Z" fill="none" strokeWidth="1.2" />

          {/* Roadway Bridge Deck Suspended over the Canyon */}
          <line x1="20" y1="155" x2="225" y2="155" strokeWidth="2.5" />
          <line x1="20" y1="159" x2="225" y2="159" strokeWidth="1.2" />

          {/* Main Parabolic Suspension Catenary Cable */}
          <path
            d="M47 70 Q 124 150 202 70"
            fill="none"
            strokeWidth="2"
          />
          {/* Anchor back-stay cables */}
          <line x1="47" y1="70" x2="10" y2="155" strokeWidth="1.6" />
          <line x1="202" y1="70" x2="235" y2="155" strokeWidth="1.6" />

          {/* Vertical Hanger Suspenders */}
          <line x1="70" y1="92" x2="70" y2="155" strokeWidth="1" opacity="0.8" />
          <line x1="90" y1="114" x2="90" y2="155" strokeWidth="1" opacity="0.8" />
          <line x1="110" y1="130" x2="110" y2="155" strokeWidth="1" opacity="0.8" />
          <line x1="124" y1="136" x2="124" y2="155" strokeWidth="1" opacity="0.8" />
          <line x1="138" y1="130" x2="138" y2="155" strokeWidth="1" opacity="0.8" />
          <line x1="158" y1="114" x2="158" y2="155" strokeWidth="1" opacity="0.8" />
          <line x1="178" y1="92" x2="178" y2="155" strokeWidth="1" opacity="0.8" />

          {/* Natural Canyon Rocks Right */}
          <path
            d="M209 238 Q 220 195 235 155 Q 245 150 260 238"
            fill="url(#outline-ambient-wash)"
            strokeWidth="1.5"
          />
        </g>

        {/* Coastal Algerian Minaret & Palm fronds on the Far Right */}
        <g id="coastal-annaba" transform="translate(1480, 0)">
          {/* Octagonal Minaret */}
          <rect x="25" y="70" width="22" height="168" fill="url(#outline-ambient-wash)" strokeWidth="1.6" />
          {/* Muezzin Balcony */}
          <line x1="20" y1="70" x2="52" y2="70" strokeWidth="2" />
          <rect x="27" y="48" width="18" height="22" fill="none" strokeWidth="1.4" />
          <path d="M27 48 L 36 32 L 45 48 Z" fill="none" strokeWidth="1.5" />
          <line x1="36" y1="32" x2="36" y2="24" strokeWidth="1.4" />
          {/* Crescent */}
          <path d="M34 20 A 4 4 0 1 1 38 27" fill="none" strokeWidth="1.3" />

          {/* Mediterranean Pine & Palm */}
          <path d="M78 238 Q 84 185 88 140" fill="none" strokeWidth="2" />
          <path d="M88 140 Q 65 125 52 138" fill="none" strokeWidth="1.5" />
          <path d="M88 140 Q 72 110 68 95" fill="none" strokeWidth="1.5" />
          <path d="M88 140 Q 95 105 108 98" fill="none" strokeWidth="1.5" />
          <path d="M88 140 Q 108 120 118 135" fill="none" strokeWidth="1.5" />
        </g>

        {/* Clean Ground Horizon Line */}
        <line x1="0" y1="238" x2="1600" y2="238" strokeWidth="1.5" opacity="0.7" />
      </svg>
    </div>
  );
}
