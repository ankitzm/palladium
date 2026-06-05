# Product

## Register

product

## Users

Avalanche-native developers, builders, and analysts deciding where to deploy or what to track.

- **Builders evaluating chains** — comparing L1s on validators, TVL, transactions, gas, and block time to decide where to deploy or integrate.
- **Tinkerers connecting fast** — want to copy an RPC, add a chain to their wallet, and paste a working snippet without leaving the page.
- **Researchers and analysts** — tracking the health of the whole Avalanche L1 ecosystem over time.
- **API consumers** — building on top of the open, key-free REST API.

Context: technical, at a desk, often comparing several chains at once and reading raw values (chainId, RPC URL, VM type). The job to be done: find and judge any Avalanche L1 quickly — is it live, is it healthy, is it worth building on — and get connected in one interaction.

## Product Purpose

Palladium is an open-source discovery dashboard plus an open REST API that indexes **every** Avalanche L1, tracks health metrics daily (validators, stake, TVL, transactions, gas, block time), and serves them to both humans and machines. Conceptually: "L1Beat for Avalanche."

Success looks like Palladium being the trusted, neutral reference for the current state of every Avalanche L1 — accurate enough to cite, honest about what it doesn't know, and the fastest path from discovering a chain to building on it.

## Brand Personality

Precise, calm, honest, developer-native.

Voice is plain and exact, with no hype. It speaks the user's vocabulary (chainId, RPC, subnet, VM type) rather than translating it into marketing. It shows the real number or an explicit `—`, never an invented `$0`. Confident without shouting; the data carries the weight, the interface stays quiet. The emotional goal is trust through transparency: the quiet competence of a well-built instrument.

## Anti-references

- **Crypto neon / glassmorphism.** No glowing gradients, glass cards, purple-to-pink palettes, or hype-token launch-page aesthetics. Saturation and glow read as hype, which is the opposite of a reference tool.
- **Raw Etherscan-style density.** Dense is fine; cramped, unstyled, hierarchy-free tables are not. Information packs in, but with rhythm, alignment, and restraint so it stays readable.

Watch (not banned, but easy to drift into): generic cards-everywhere SaaS sameness — keep every card earned; and marketing-heavy DeFi copy — keep words specific to what the product literally does.

## Design Principles

1. **Data first, chrome second.** The numbers are the design. Chrome recedes so the data reads; decoration never competes with a value the user came to see.
2. **Honest by default.** Missing data is an explicit `—`, never invented. Staleness is always visible. A chain only offers actions it can actually perform. Trust is earned by never overstating, and lost the first time a fake value appears.
3. **Tinkerer-friendly.** Every chain is one interaction from connecting — copy RPC, add to wallet, paste a ready snippet. Always shorten the distance from "found a chain" to "building on it."
4. **Earned familiarity over novelty.** Reach for the patterns a power-user already trusts (tables, command palette, mono for anything copyable). Spend invention only where it clearly wins the task, never for flavor.
5. **Quiet confidence.** Calm and exact beats loud. The interface persuades through precision and completeness, not through emphasis, color, or motion.

## Accessibility & Inclusion

- **Target WCAG 2.1 AA** contrast for all text and meaningful UI, including muted, faint, and placeholder text against tinted dark surfaces (the most likely failure point).
- **Never encode state by color alone.** Up/down deltas carry a sign or arrow (`+`/`−`, `▲`/`▼`) and live/none carries a shape (`●`/`○`) or label in addition to hue. This is a hard requirement given the red/green semantic deltas on the dark theme (deuteranopia safety).
- **Dark-theme-only today.** If a light theme is added later, both must clear AA independently.
- **Respect `prefers-reduced-motion`** — state transitions degrade to instant or a crossfade.
- **Fully keyboard operable.** Every action (copy, add-to-wallet, navigation, `⌘K` search) works without a mouse, with a visible focus ring.
