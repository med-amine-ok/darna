# BLADUS "Clear Blue" palette (2026-11)

Goal: a white canvas where the next action is obvious at first sight. One action blue for
everything clickable, navy for text, slate greys for secondary text, no low-contrast tints for text.

| Role | Token | Hex | Contrast on white | Use |
|---|---|---|---|---|
| Page background | `bg-darnaBg`, `bg-white` | #FFFFFF | n/a | All pages |
| Quiet band | `bg-darnaBg-300` | #F5F8FC | n/a | Alternating sections, open popovers |
| Ink (headings, body) | `text-primary-800` / `900` | #152C52 / #0E1F3B | 13.9:1 / 16:1 | Text, dark secondary buttons |
| Action blue | `bg-accent-600`, `bg-cta` | #0B57D0 | 6.4:1 (white text on it) | Primary buttons, links, focus rings, selected tabs |
| Action blue hover | `accent-700` | #0846AB | 8.5:1 | Hover, active text on `accent-50` |
| Secondary blue | `secondary-600` | #0E6FAD | 5.4:1 | Secondary actions, chips, icons |
| Muted text | `neutral-600` | #475569 | 7.6:1 | Meta text, counts |
| Lightest text allowed | `neutral-500` | #64748B | 4.8:1 | Placeholders only |
| Hairlines | `tertiary-200` / `300` | #E4EAF2 / #D3DCE8 | n/a | Borders, dividers |
| Success / warning / danger | `status-success` / `warning` / `error` | #15803D / #B45309 / #B91C1C | 5 to 6.5:1 | Status only, never decoration |
| Logo sun | (image) | gold | n/a | The only warm colour in the brand |

Rules
- One primary action per view uses `Button` variant `primary` (action blue gradient). Secondary actions use navy (`secondary` variant) or outline.
- Never use `neutral-400` or lighter for text. Never put text on `secondary-300` or lighter without navy ink.
- Focus: 2px `accent-600` ring with 2px white offset on every interactive element.
- Checkboxes are square (`rounded-[4px]`), radios are round; checked state is `accent-600` fill with a white mark.

Sources consulted (2026-11-04): Booking.com brand blue #003A9A (10.1:1 on white),
WebAbility WCAG guide (action blue #1D4ED8 with white text), AudioEye colour-blind palette (deep blue #0057B8).
Ratios above were computed with the WCAG 2.x relative luminance formula.

The website (`frontend/tailwind.config.js`) and the admin (`admin/tailwind.config.js`) use the same values.
`frontend/lib/tokens.ts` mirrors them for canvas/SVG use.
