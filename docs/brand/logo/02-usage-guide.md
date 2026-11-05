# BLADUS logo: usage guide

> **In plain words**
> The BLADUS symbol is a zellige star, the eight-pointed *khatam* of Algerian tilework (Qal'at Bani Hammad, Tlemcen), with the B of BLADUS at its heart.
> Use the colour version on white, the reversed version on navy, and the small version for icons under 32 px.
> Never redraw, recolour, stretch or add effects. All files are in `kit/`.

## 1. The idea

Zellige is cut tile set in white grout. The symbol is built the same way: a navy star cut by two white grout lines (the two interlaced squares of the khatam), a blue centre tile, and the B of the BLADUS wordmark. One sentence: *the B of BLADUS, set like a tile in an Algerian zellige star.*

## 2. Files (`kit/svg` masters, `kit/png` exports)

| Use | File |
|---|---|
| Symbol, colour (default) | `bladus-symbol.svg` |
| Symbol on navy or photos | `bladus-symbol-reversed.svg` |
| Symbol 16 to 32 px (favicon, tabs) | `bladus-symbol-small.svg` |
| One colour (stamps, receipts, embroidery) | `bladus-symbol-navy.svg`, `-black.svg`, `-white.svg`, `bladus-symbol-small-white.svg` |
| Horizontal lockup | `bladus-horizontal.svg`, `-reversed.svg`, `-black.svg`, `-white.svg` |
| Stacked lockup | `bladus-vertical.svg`, `-reversed.svg`, `-black.svg` |
| Wordmark alone | `bladus-wordmark.svg` |
| Web icons | `favicon.ico` (16/32/48), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-icon.png` (180) |
| Social sharing | `og-logo.png` (1200 x 630) |

The same files are copied to `frontend/public/brand`, `admin/public/brand`, the `public/assets/logo*.png` files and the `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico` of both apps.

## 3. Colours

| Name | HEX | RGB | Role |
|---|---|---|---|
| Navy ink | `#152C52` | 21, 44, 82 | Star, wordmark |
| Action blue | `#0B57D0` | 11, 87, 208 | Centre tile |
| White | `#FFFFFF` | 255, 255, 255 | B, grout |

CMYK and Pantone matches must be proofed by the printer before the first print run.

## 4. Typography

Wordmark: **Fraunces** (SIL Open Font License, logo use allowed), weight 700, optical size 144, tracking 0.11 em, with a manual kern on L-A. The B in the symbol is Fraunces weight 800. All letters are converted to outlines; no font is needed to display the logo.

## 5. Clear space and minimum size

- Clear space on every side: **the width of the centre tile's B** (about 30 % of the symbol height).
- Minimum sizes: symbol 16 px (use the small version below 32 px), horizontal lockup 96 px wide, stacked lockup 64 px wide. Print: symbol 6 mm.

## 6. Backgrounds

| Background | Version |
|---|---|
| White, very light blue | Colour |
| Navy, dark photos | Reversed or white |
| Busy photos | Put the logo on a solid white or navy panel |
| One-colour print | Navy, black or white |

## 7. Do not

- Change the colours, add gradients, shadows or outlines.
- Rotate the star, stretch it, or redraw the B in another font.
- Put the colour version on navy (the star disappears) or the reversed version on white.
- Rearrange the lockups or change the space between symbol and wordmark.

## 8. Open items

- Trademark search by a professional before public launch (INAPI in Algeria, plus WIPO Global Brand Database).
- Print proofs for CMYK and Pantone.
- The Rub el Hizb shares the geometry of the eight-pointed star; in a zellige context it reads as craft, but test it with your audience.

How the files are made: `_tools/build_kit.py` (geometry, variants and exports), `_tools/glyphs.py` (Fraunces outlines).
