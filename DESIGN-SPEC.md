# Palladium — Design Spec

Dark, Avalanche-centric, developer-first explorer for every Avalanche L1. This is the
single source of truth for the UI rebuild: tokens, components, page layouts, responsive
behavior, and a build plan that maps onto `apps/web` (Next.js 16 + Tailwind v4).

Status: design locked. Data is wired separately (see "Data & empty states").

---

## 1. Design principles

1. **Data first, chrome second.** One accent color, neutral surfaces, monospace for anything numeric or copyable. The data is the design.
2. **Honest by default.** Missing data renders as `—`, never a fake `$0`. RPC-less chains hide actions they can't perform. Staleness is always visible.
3. **Tinkerer-friendly.** Every chain is one click from copy-RPC, add-to-wallet, and a ready-to-paste code snippet.
4. **One system, two form factors.** The same tokens and components drive desktop and mobile; only layout reflows.

---

## 2. Color tokens

Dark theme only (for now). All values are the exact hex used in the mockups.

### Surfaces

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0a0b0d` | Page background |
| `surface` | `#141518` | Cards, search bar, raised panels |
| `surface-2` | `#0e0f12` | Inset fields inside a card (RPC value, mini-stats) |
| `code` | `#101114` | Code blocks, table header strip |
| `elevated` | `#1b1d21` | Hover row, active nav pill, logo-less chip |
| `chip-neutral` | `#2a2c31` | Non-featured chain icon background |

### Borders

| Token | Value | Use |
|---|---|---|
| `border` | `rgba(255,255,255,0.07)` | Default hairline (all cards, dividers) |
| `border-strong` | `rgba(255,255,255,0.12)` | Search bar, inputs, emphasized edges |
| `row-line` | `rgba(255,255,255,0.05)` | Table row separators |

All borders are `0.5px`. Single-sided accent borders are not used.

### Text

| Token | Hex | Use |
|---|---|---|
| `text` | `#f5f5f7` | Primary text, chain names, stat numbers |
| `text-line` | `#c9cbd1` | Card titles, strong secondary |
| `text-muted` | `#9a9ca2` | Labels, nav inactive, VM type |
| `text-dim` | `#8b8d93` | Stat labels, hints |
| `text-faint` | `#6f727a` | Row numbers, placeholder, table headers |

### Accent — Avalanche red

| Token | Value | Use |
|---|---|---|
| `red` | `#e84142` | Primary accent, featured icon bg, primary button, active polyline |
| `red-soft` | `rgba(232,65,66,0.12)` | Active filter chip bg, dev-mode highlight, sponsored slot |
| `red-text` | `#ff7a7a` → `#ff8a8a` → `#ff9a9a` | Red text on dark (links, active dev rows) |
| `red-area` | `rgba(232,65,66,0.16)` | Chart area fill under the line |

### Semantic

| Token | Value | Use |
|---|---|---|
| `green` | `#3ad17e` | Live dot, positive change |
| `green-text` | `#5ee49b` | "live", GET method, positive on dark |
| `green-soft` | `rgba(58,209,126,0.13)` | Live badge bg |
| `negative` | `#ff6b6b` | Negative change (`−1.2%`, `▼`) |

### Syntax highlighting (code blocks)

| Token | Hex | Token type |
|---|---|---|
| `syn-keyword` | `#c792ea` | `import`, `export const`, `from` |
| `syn-string` | `#5ee49b` | string literals |
| `syn-number` | `#ffb86b` | numeric literals |
| `syn-prop` | `#7fb6ff` | object keys / params |
| `syn-comment` | `#6f727a` | comments, shell prompt |

---

## 3. Typography

Three families. Load via `next/font`.

| Family | Font | Weights | Use |
|---|---|---|---|
| Sans | **Inter** | 400, 500 | All UI text |
| Serif | **Spectral** | 500 | Hero headline only |
| Mono | **JetBrains Mono** | 400, 500 | All data, IDs, code, table cells, badges |

Two weights only: 400 and 500. Never 600/700.

### Scale

| Role | Size / weight / family | Notes |
|---|---|---|
| Hero | 42 / 500 / serif | `line-height: 1.08`; 34 on mobile |
| Page title | 18 / 500 / sans | Chains, API |
| Section title | 15 / 500 / sans | "All chains", card headers |
| Section label | 11 / 500 / sans | letter-spacing 1.5–2px, uppercase, muted or red kicker |
| Stat number (band) | 28–30 / 500 / sans | unit suffix at 16, dim |
| Metric value (card) | 18–20 / 500 / sans | — |
| Body | 13–14 / 400 / sans | line-height 1.6 |
| Label | 11–12 / 400 / sans | dim |
| Data / mono | 11–12 / 400 / mono | tables, IDs, params |

Sentence case everywhere except the uppercase section labels and mono enum values.

---

## 4. Spacing, radius, motion

- **Radius:** `lg` 14px (page container), `md` 11–12px (cards), `sm` 7–9px (inset fields, buttons, chips), `pill` 6px (badges/filter pills).
- **Page padding:** 22px desktop, 14px mobile.
- **Card padding:** 14–16px. Inset field padding: 7–9px.
- **Grid gaps:** 10–14px between cards; 6–8px between inline controls.
- **Borders:** always `0.5px`.
- **Motion:** 150ms ease on toggle/hover/active. Buttons `active: scale(0.98)`. No shadows except input focus rings. No gradients, glow, or blur.

---

## 5. Tailwind v4 `@theme` mapping

Drop into `apps/web/src/app/globals.css`, replacing the current custom-color block.

```css
@theme inline {
  --color-bg:            #0a0b0d;
  --color-surface:       #141518;
  --color-surface-2:     #0e0f12;
  --color-code:          #101114;
  --color-elevated:      #1b1d21;
  --color-chip:          #2a2c31;

  --color-border:        rgb(255 255 255 / 0.07);
  --color-border-strong: rgb(255 255 255 / 0.12);
  --color-row-line:      rgb(255 255 255 / 0.05);

  --color-text:          #f5f5f7;
  --color-text-line:     #c9cbd1;
  --color-text-muted:    #9a9ca2;
  --color-text-dim:      #8b8d93;
  --color-text-faint:    #6f727a;

  --color-avax-red:      #e84142;
  --color-avax-red-soft: rgb(232 65 66 / 0.12);
  --color-avax-red-text: #ff7a7a;

  --color-pos:           #3ad17e;
  --color-pos-text:      #5ee49b;
  --color-pos-soft:      rgb(58 209 126 / 0.13);
  --color-neg:           #ff6b6b;

  --font-sans:  "Inter", system-ui, sans-serif;
  --font-serif: "Spectral", Georgia, serif;
  --font-mono:  "JetBrains Mono", ui-monospace, Menlo, monospace;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 14px;
}
```

Then primitives like `bg-surface`, `text-text-muted`, `border-border`, `text-avax-red`,
`font-mono` are available as utilities.

---

## 6. Components

Each maps to a React component in `apps/web/src/components/`. States listed are the ones
the design relies on; default everything else.

### TopNav
Sticky, `bg` at 85% + `backdrop-blur`, `0.5px` bottom border, 58px tall.
Left: logo (24px red rounded square + mountain icon) + wordmark + mode label. Center/left: nav links (Explore, Chains, Validators, API) — inactive `text-muted`, active = `elevated` pill. Right: `DevModeToggle`, live block height (mono, faint, green dot). Mobile: links collapse behind a hamburger; block height + mode label hidden.

### DevModeToggle
Label + 38×20 track with 16px knob. Off `chip-neutral`; on `red` + knob `translateX(18px)`. Toggles a root `dev` class. Effects in dev mode: reveals API console on Home, reveals `ChainID` + `RPC` columns in tables, shifts footer copy to query voice. Persist to `localStorage`.

### StatBand
4-up grid, full-bleed, top+bottom `0.5px` border, right divider between cells (last omitted). Each cell: 28–30/500 number with dim unit suffix, then 11px uppercase label + colored delta (`▲` green / `▼` negative). Mobile: 2×2, internal dividers adjust.

### MetricCard
`surface` + `0.5px border`, radius-md, 12px pad. 11px dim label → 18–20/500 value → 11px sub. Used in 4-up grid on chain detail.

### SpotlightCard ("Chain in focus")
`surface` card, 2-col (`1.1fr / 1fr`): left = icon + name + subtitle + blurb + primary CTA; right = 2×2 inset mini-stats on `surface-2`. Mobile: single column, mini-stats below.

### ChainTable
Mono, 12px. Header strip `text-faint`, right-aligned numerics, left-aligned chain/VM/RPC. Row separators `row-line`; zebra via `surface` tint on even rows; hover `elevated`; whole row is a link to detail. Leading chain icon chip (20px, red for featured else `chip-neutral`). `ChainID` + `RPC` columns are `dev-col` (hidden unless dev mode). RPC cell: `● live` (green-text) / `○ none` (faint). Trailing action cell: wallet + copy + arrow icons (`text-faint`, hover `text`); copy/wallet hidden when no RPC. Overflow-x scroll; `min-width: 540–620px`. Mobile: render as stacked cards instead (see ChainCard).

### ChainCard (mobile row)
`surface` card: icon + name + `id NNNN · vm` (mono, faint) + RPC status; second line = inline `TVL / val / Δ%` in mono. Dimmed to 0.75 opacity when no RPC.

### SearchBar
`surface` + `border-strong`, radius-md, 12px pad. Search icon + input (placeholder `text-muted`) + `⌘K` kbd hint. Hosts query syntax: `chainId:`, `vm:`, `tvl:>100M`, raw `0x…` address.

### FilterRail
Inline wrap. Group label (faint) + `FilterPill`s. `FilterPill`: mono 11px, `surface`/`border` idle, `red` bg + `bg`-colored text when active. Vertical `border-strong` separators between groups. Sort control on the right. Below: removable active-filter chips (`red-soft` bg, `red-text`, trailing `×`) + result count.

### NetworkParams
Card titled with plug icon. Rows: label (faint 11px) above an inset `surface-2` value field (mono). RPC + explorer rows have a trailing copy/external icon. Chain ID shows `4337 · 0x10f1`. Chain ID + Symbol share a 2-col row. Each value field is independently copyable.

### CodeBlock
`code` bg, `0.5px border`, radius-md. Header bar: optional method badge + path/title + right-aligned copy affordance. `<pre>` mono 11.5px, line-height 1.7, syntax-colored spans, `overflow-x: auto`. Language tabs (cURL/fetch/wagmi) attach to the top-left with a notched radius.

### Badge / MethodBadge
Badge: mono 11px, `elevated` bg, pill radius, `text-muted`. Variants: `live` (green-soft bg, green-text, leading dot). MethodBadge: `GET` green-soft/green-text, `POST` red-soft/red-text.

### Button
Default: `surface` bg, `border-strong`, `text-line`, radius-sm, 8×13 pad, icon+label, hover `elevated`. Primary: `red` bg, `#0a0b0d` text, 500 weight. `active: scale(0.98)`.

### Charts
Inline SVG, no chart lib needed for v1. Area: `red` 2px polyline over `red-area` fill. Bars: `red` for above-median days, `chip-neutral` otherwise, 2px radius. `preserveAspectRatio="none"`, fixed viewBox, responsive width. Swap for Recharts when wired to `/metrics`.

### Pagination, MobileTabBar, Toast
Pagination: mono, prev/next `surface` buttons, current page `elevated`. MobileTabBar: 4 icons (compass/stack/shield/code), active `red`, top border. Toast: bottom-center `surface` pill, green check + message, 1.8s auto-dismiss (copy confirmations).

---

## 7. Pages

### Home / Overview (`/`)
TopNav → editorial header (red kicker + serif hero) → StatBand (TVL, validators, 24h txns, L1s) → `[dev-only]` API console → SpotlightCard → "All chains" section (synced-ago indicator) → ChainTable (top 5) → footer link "view all chains". Force-dynamic server component; data from `/api/overview`.

### Chains directory (`/chains`)
TopNav → page title + counts → SearchBar → FilterRail (VM type, RPC live-only, sort) → active-filter chips → ChainTable (full, paginated) → Pagination. Client component for filter/sort/search; data from `/api/chains` with query params. Rows link to detail.

### Chain detail (`/chains/[slug]`)
TopNav → breadcrumb → header (icon, name, live badge, VM/chainId/category badges, actions: add-to-wallet / faucet / explorer) → 4 MetricCards → 2-col body: left = TVL area chart + daily-tx bars + viem CodeBlock; right = NetworkParams + Validators list + Technical IDs. Data from `/api/chains/:slug` (+ `/metrics` for charts). Actions/snippet only render when `rpcUrl` + `evmChainId` exist.

### API docs (`/api-docs`)
TopNav → 2-col: endpoint sidebar (sticky) + main (method+path, description, params table, language-tabbed request CodeBlock, response CodeBlock with `200 OK`). Static content. Mobile: sidebar becomes a horizontal endpoint picker / dropdown.

### Validators (`/validators`) — new, optional
Nav already links here. Proposed: StatBand (total validators, total stake, avg uptime, active sets) → table of validators across chains (NodeID, chain, stake weight, uptime, since). Same ChainTable patterns. Flag if in scope.

---

## 8. Responsive rules

- **Breakpoints:** `≤860px` collapse 2-col bodies to 1-col (charts, spotlight, API sidebar stacks/horizontal). `≤720px` mobile: nav → hamburger, StatBand → 2×2, tables → ChainCards, MobileTabBar appears, hero → 34px.
- **Tables never horizontally cramp on mobile** — they convert to stacked cards.
- **Filter rails scroll horizontally** rather than wrapping tall on mobile.
- **Primary action stays reachable:** chain detail pins a full-width "Add to wallet" at the bottom on mobile.

---

## 9. Data & empty states

These are design contracts, not afterthoughts — they reflect the real backend gaps noted in `CLAUDE.md`.

- **Null TVL** → `—` in `text-faint`. Only ~6 chains have DeFiLlama matches. Never render `$0`.
- **No RPC** (`rpcUrl` null) → `○ none`; hide copy-RPC, add-to-wallet, and snippet; dim mobile ChainCard to 0.75. Only ~4–5 chains have RPCs.
- **No block time / gas** (no RPC) → `—`, sub-label "no RPC".
- **Staleness:** metrics key on today's date and go stale after midnight. Always show "synced N min ago" + green dot; if the latest metrics date < today, show an amber "data is from {date}" note.
- **Number formatting:** USD → `$NNN.N{M|B}`; counts → `N.NM` / `NNNK`; always round (`Math.round`/`toFixed`) before display.
- **Change deltas:** `+`/`−` with green/negative color; null change → `—`.

---

## 10. Build plan (maps to `apps/web`)

1. **Tokens** — replace color block in `globals.css` with §5; wire `next/font` for Inter/Spectral/JetBrains Mono.
2. **Primitives** — `components/ui/`: `Button`, `Badge`, `MethodBadge`, `CodeBlock`, `Toast`, `Kbd`.
3. **Domain components** — `components/`: `TopNav`, `DevModeToggle`, `StatBand`, `MetricCard`, `SpotlightCard`, `ChainTable` (+ `ChainCard`), `SearchBar`, `FilterRail`, `NetworkParams`, `ValidatorList`, `Pagination`, `MobileTabBar`, `Chart` (`AreaChart`, `BarChart`).
4. **Pages** — rebuild `app/page.tsx`, `app/chains/page.tsx`, `app/chains/[slug]/page.tsx`, `app/api-docs/page.tsx`; (optional) `app/validators/page.tsx`. Keep server components by default; `"use client"` only for `DevModeToggle`, `ChainTable` interactivity, `SearchBar`/`FilterRail`.
5. **Formatting utils** — `lib/format.ts`: `fmtUsd`, `fmtNum`, `fmtChange`, `fmtChainId(hex)`, `shortId`.
6. **Empty-state pass** — apply §9 contracts everywhere before considering a page done.

Recommended order: tokens → primitives → ChainTable + Home → Chains → Chain detail → API docs → mobile pass → Validators (if in scope).

---

*Reference mockups: see the desktop and mobile design concepts in the design session. Numbers shown there are illustrative placeholders.*
