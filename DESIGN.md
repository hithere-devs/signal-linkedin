---
name: "Signal"
description: "Blue-ink workspace for understanding and filtering a professional feed."
colors:
  accent: "#4764d7"
  accent-hover: "#3652c2"
  accent-soft: "#edf1ff"
  accent-ink: "#ffffff"
  bg: "#f7f9fc"
  surface: "#ffffff"
  sidebar: "#f2f5f9"
  surface-muted: "#f0f3f8"
  surface-hover: "#eaf0f8"
  text: "#25344c"
  text-soft: "#43556f"
  text-dim: "#5b6d86"
  border: "#dfe5ef"
  border-strong: "#c2ccdb"
  chart-muted: "#d5deec"
  positive: "#217767"
  positive-soft: "#eaf5f0"
  danger: "#b33f42"
  danger-soft: "#fff0f0"
  warning: "#866013"
  warning-soft: "#fff8e6"
  dark-accent: "#92a8ff"
  dark-accent-hover: "#b0bfff"
  dark-accent-soft: "#253456"
  dark-accent-ink: "#172141"
  dark-bg: "#141b27"
  dark-surface: "#1b2433"
  dark-sidebar: "#111925"
  dark-surface-muted: "#222e40"
  dark-surface-hover: "#29364b"
  dark-text: "#e6edf7"
  dark-text-soft: "#c1cde0"
  dark-text-dim: "#a0b0c7"
  dark-border: "#303d52"
  dark-border-strong: "#455770"
  dark-chart-muted: "#3b4a64"
  dark-positive: "#87d6ba"
  dark-positive-soft: "#203d36"
  dark-danger: "#ffafb0"
  dark-danger-soft: "#472a35"
  dark-warning: "#ead087"
  dark-warning-soft: "#3e3725"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "29px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.027em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  title-small:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 650
    lineHeight: 1.5
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.6
  button:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 550
    lineHeight: 1.4
  input:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  threshold:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.03em"
  site-display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(48px, 5.4vw, 72px)"
    fontWeight: 650
    lineHeight: 1.05
    letterSpacing: "-0.04em"
  site-title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(30px, 3.5vw, 42px)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  site-body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  radius: "14px"
  radius-sm: "8px"
  nav: "7px"
  chip: "6px"
  compact-label: "5px"
spacing:
  "4": "4px"
  "6": "6px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "22": "22px"
  "24": "24px"
  "28": "28px"
  "36": "36px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.radius-sm}"
    padding: "9px 14px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.accent-ink}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-soft}"
    typography: "{typography.button}"
    rounded: "{rounded.radius-sm}"
    padding: "9px 14px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.text-soft}"
    typography: "{typography.button}"
    rounded: "{rounded.radius-sm}"
    padding: "9px 14px"
  button-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.button}"
    rounded: "{rounded.radius-sm}"
    padding: "9px 14px"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.input}"
    rounded: "{rounded.radius-sm}"
    padding: "9px 12px"
  navigation-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.nav}"
    padding: "9px 12px"
  chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-soft}"
    rounded: "{rounded.chip}"
    padding: "4px 8px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.radius}"
    padding: "24px"
  switch-on:
    backgroundColor: "{colors.accent}"
    rounded: "20px"
    height: "21px"
    width: "36px"
  threshold-control:
    textColor: "{colors.text}"
    typography: "{typography.threshold}"
    width: "100%"
---

# Design System: Signal

## Overview

**Creative North Star: "Blue-ink field guide"**

Signal uses blue ink, pale gray pages, and white panels to organize a working interface. Compact headings, thin dividers, and explanations beside controls make filtering decisions easy to inspect. The field-guide reference appears in annotations and grouping, not paper textures or decorative frames.

The dashboard, settings, popup, and demo share the same controls and theme. The public site keeps the light palette and adds space for reading. This document records the implemented system; page composition and direction history remain in the workspace brief.

**Key Characteristics:**

- One blue accent for actions, selection, and chart marks.
- Flat bordered panels and compact, labeled controls.
- Desktop side navigation that becomes horizontal links on mobile.
- A three-bar Signal mark, SVG icons, and visible sample-data notices.

## Colors

The palette combines blue annotations with cool neutral backgrounds and three levels of ink. Frontmatter names describe the light theme; each `dark-` token replaces the corresponding light role in dark mode.

### Primary

- Blue ink, blue hover, and blue wash use `accent`, `accent-hover`, and `accent-soft`. They identify actions, active navigation, selected modes, range progress, and kept-post chart segments.
- `accent-ink` is text or mark detail on solid blue. Use its theme-specific value rather than assuming white in dark mode.

### Neutral

- `bg` is the page, `sidebar` is navigation, and `surface` is a panel or field. `surface-muted` groups secondary content; `surface-hover` marks hover feedback.
- `text`, `text-soft`, and `text-dim` separate primary content, supporting labels, and secondary copy. Do not substitute the older, lighter secondary ink.
- `border` divides content; `border-strong` defines controls. `chart-muted` represents filtered posts or the unfilled range track.

Positive green, error red, and warning amber each have a matching soft background. They indicate success or active filtering, failures or destructive actions, and paused or unsaved states. They are status colors, not additional brand accents.

**The Blue Annotation Rule.** Use blue for actions, selected controls, active navigation, and data marks. Pair state colors with text, an icon, or a distinct control state.

The app defaults to light mode. An explicit choice persists under `signal.appearance` and applies through the root `data-theme` attribute; it does not automatically follow the OS. The public site is light-only. Injected post controls inspect their host background when no explicit page theme exists. Sidecar tonal ramps are generated swatch previews, not extra implementation tokens.

## Typography

App typography, public-site body copy, and controls use the local system sans stack. Public-site hero, section, privacy-strip, and legal-page headings use Manrope.

Manrope is self-hosted at `site/assets/fonts/manrope-latin.woff2`, with variable weights (200 to 800) and `font-display: swap`. The OFL license is included at `site/assets/fonts/OFL.txt`. No remote font service is required.

- `headline` is the app page title; it becomes (24px) at the narrow app breakpoint.
- `title` and `title-small` identify panels and subsections.
- `body` is the app default; descriptive copy commonly uses (12px or 13px) with a more open line height. Long descriptions stop around (65ch to 70ch).
- `label`, `button`, and `input` preserve the distinct weights and sizing of those controls. Use sentence case.
- `threshold` is the shared score readout. It uses tabular numerals, as do outcome metrics and data rows. The popup uses a smaller readout (28px).
- `site-display` is the public-site hero heading. It becomes (58px) at (760px) and below, then (48px) at (480px) and below.
- `site-title` is the public-site section heading. It becomes (32px) at (480px) and below. Privacy-strip and legal-page headings share Manrope but keep their own sizing.
- `site-body` is the public-site reading default. Installation code uses `ui-monospace, SFMono-Regular, Menlo, monospace`.

**The Labels Stay Rule.** Keep action names and field labels visible as layouts narrow. Icons support those labels; icon-only utilities need accessible names.

Keep the public-site display scale separate from app headings. Small chart ticks and compact popup metadata remain component-specific rather than defining the default text size.

## Layout

- The desktop app has a sticky navigation column (228px) and a flexible main area. Content is centered within a maximum width (1344px), with side padding (36px). At (1180px) and below, navigation narrows (206px) and side padding becomes (24px).
- Repeated panel padding is (24px), falling to (20px) on narrow screens. Common layout gaps are (20px, 22px, and 28px). The spacing entries are observed sizes, not a strict mathematical scale.
- Major two-column dashboard, settings, and demo layouts stack at (1020px). At (800px), navigation becomes a normal-flow header with horizontally scrollable, labeled links. Page side padding becomes (20px), then (16px) at (540px). Feed-control columns simplify at (620px); dashboard outcomes become a two-column strip at (580px).
- The popup is a compact controller with a maximum width (384px), not a miniature dashboard. Its standalone web preview adds an outer border; at (383px) and below, that wrapper disappears.
- The public site uses a centered container with a maximum width (1140px) and total side allowance (56px). Reading and demo columns stack at (760px); at (480px) and below, the side allowance becomes (36px). Do not impose the app's navigation grid on the public site.

## Elevation & Depth

Background changes and single-pixel dividers provide most separation. The shared overlay shadow lifts the native confirmation dialog and sticky unsaved-changes bar. Score explanations have their own popover shadow; the range thumb has a small local shadow. Exact light, dark, popover, and thumb values live in the sidecar's shadow vocabulary.

**The Flat Panel Rule.** Resting panels use a thin border without a shadow. Reserve lift for floating decisions, score explanations, and the range thumb.

State transitions use (160ms) with `ease`, normally on background, border, color, or thumb position. Reduced-motion rules shorten shared transitions to (0.01ms); badge transitions and the loading spinner stop. Do not generalize the feed's blur transition into page animation.

## Shapes

Panels use the shared panel radius; buttons and fields use the smaller control radius. Navigation, tags, and compact labels have their own tighter corners. Borders stay thin (1px). Circles identify status dots and movable control thumbs, not every container.

The Signal mark is a rounded square with three ascending bars. Keep that geometry. The app renders it as inline SVG and uses Lucide line icons, commonly (18px) with a stroke width (1.7) in navigation. Browser icon files are identity assets, not decorative artwork. No decorative raster asset is part of the UI.

## Components

### Buttons

Compact, labeled actions. The primary variant uses blue and on-blue ink; secondary uses the panel fill and a stronger border; quiet removes the resting fill and border; danger uses the error pair. Standard buttons have a minimum height (39px). Hover changes color without shifting position. Disabled controls reduce opacity to (0.55) and show the unavailable cursor. Keyboard focus uses an outline (2px) with an offset (3px).

### Inputs, switches, and chips

Fields have a visible label, a stronger border, and a minimum height (41px). Hover strengthens the border; focus makes it blue and adds the keyboard outline. Keep hints and error text beside their fields. Switches use native checkboxes with a switch role and a visible label. The thumb moves within a compact track; checked state uses blue. Chips wrap long text and provide a named remove button when editable.

### Cards and navigation

Panels group related content with a heading and short explanation, not a repeated outer shadow. Navigation uses semantic links with `aria-current` for the active page. The active link combines blue text, blue wash, stronger weight, and a desktop marker. Keep the mobile links scrollable rather than replacing them with unexplained icons.

### Threshold and feed preview

Reuse the shared range input, numeric value, endpoint labels, and preset group. The presets are Open (30), Balanced (55), and Focused (75); the underlying range is (0 to 100). Selected presets expose `aria-pressed`. Feed examples have visible fictional-data labels, score explanations, and reveal controls. These examples demonstrate behavior without pretending to be saved user posts.

### Feedback and post controls

Success messages use status semantics; errors use alert semantics. Loading, retry, empty, saved, and unsaved states include text. Destructive confirmation uses a native dialog with Cancel focused first. Injected post badges and reveal controls live in Shadow DOM and keep their own styles. Their explanation popovers fit the viewport and pair score color with a number and reasons.

Implementation sources are `src/ui/theme.css`, `src/ui/components.tsx`, and `src/ui/appearance.ts`; app-specific rules live in the dashboard, settings, popup, and demo stylesheets. Public-site rules live in `site/styles.css`. Injected controls live in `src/content/badge.ts` and `src/content/filter.ts`.

## Do's and Don'ts

### Do:

- Do reuse the shared theme and components before adding local styling.
- Do test both explicit app themes and the post background used by injected controls.
- Do retain labels, keyboard focus, status text, and reveal actions when adapting a layout.
- Do label fictional activity and feed examples where they appear.
- Do use tabular numerals for comparable scores, counts, and percentages.

### Don't:

- Don't use blue, green, amber, or red as decoration unrelated to an action or state.
- Don't add shadows to every bordered panel or wrap ordinary content in extra cards.
- Don't replace the three-bar mark with a wireless symbol or use text glyphs as interface icons.
- Don't ship a mock image as a control, chart, or page background.
- Don't promote tiny chart captions, fixture scores, or public-site display sizes into general UI defaults.
