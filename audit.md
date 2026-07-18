 Fix touch targets < 44px across ALL components (47 instances)
[ ] Add focus trap + Escape key to ALL 7 modals
[ ] Fix interactive divs → role=button + tabindex in GrantsDashboard
[ ] Fix external links: add rel=noopener in GrantsFooter
[ ] Fix v-html XSS risk in index.vue
[ ] Fix font sizes < 10px (FormField, GrantDetailModal, GrantEditModal)
[ ] Add responsive breakpoints to ClaimGrantModal, ReviewClaimModal
[ ] Add empty state for search results in GrantsDashboard
[ ] Verify lint passes

The Claims section condition has an invalid 'all' check
The useI18n import in GrantsDashboard.vue is duplicated (already imported at line 227)
The edge function handleCreate has duplicate rateLimit check since handleManage already does it


Grants UI/UX Audit Report
1. GrantsDashboard.vue (1153 lines)
Responsive Design
- Line 407: padding: 0 28px — fixed px, should use clamp() for fluid spacing
- Line 408: height: 52px — fixed header height, not fluid
- Line 412: gap: 16px — fixed px
- Line 466: max-width: 280px — search input max-width is fixed px
- Line 689: padding: 0 28px 48px — fixed px
- Line 699: padding: 80px 0 — loading state padding fixed px
- Line 735: margin-bottom: 20px — hero chip margin fixed px
- Line 758: gap: 40px — hero stats gap fixed px
- Line 867: gap: 10px — section scroll gap fixed px
- Line 890: flex: 0 0 240px — card width is fixed, breaks horizontal flow on very small screens
- Line 1052: padding: 32px — popup padding fixed px
- Line 1053: max-width: 340px — popup max-width fixed px
- Line 1104-1152: Mobile breakpoint only covers 768px — no tablet breakpoint (e.g., 1024px)
Glassmorphism Consistency
- Line 398: .gstore-header uses rgba(0, 0, 0, 0.92) + backdrop-filter: blur(24px) ✅
- Line 621: .gstore-nav uses rgba(0, 0, 0, 0.92) + backdrop-filter: blur(24px) ✅
- Line 892-893: .gstore-card uses var(--glass) + backdrop-filter: blur(16px) ✅
- Issue: Header and nav use hardcoded rgba(0,0,0,0.92) instead of CSS custom property, inconsistent with card glass variable
Typography
- Line 437: font-size: 15px — fixed px for logo text
- Line 449: font-size: 12px — fixed px for badge
- Line 488: font-size: 13px — search input
- Line 639: font-size: 13px — nav pill
- Line 739: font-size: 40px — hero title is fixed px, should be clamp() (mobile override at line 1128 uses 28px)
- Line 749: font-size: 17px — hero subtitle fixed px
- Line 769: font-size: 28px — hero stat number fixed px
- Line 836: font-size: 20px — section title fixed px
Spacing
- Line 720: padding: 60px 0 40px — hero section fixed px, should be clamp()
- Line 813: margin-bottom: 36px — section margin fixed px
Touch Targets
- Line 544-552: .gstore-signout-btn — padding: 2px 4px = 18px min height — FAILS 44px minimum
- Line 559-573: .gstore-create-btn — padding: 6px 14px = ~28px height — FAILS 44px minimum
- Line 630-646: .gstore-nav-pill — padding: 6px 14px = ~28px height — FAILS 44px minimum
Accessibility
- Line 37: .gstore-create-btn is a <div> with @click — not keyboard accessible, no role="button", no tabindex
- Line 41-45: .gstore-user-pill is a <div> container with no interactive semantics
- Line 57-68: Nav pills are <button> ✅
- Line 116-121: .gstore-card is a <div> with @click — not keyboard accessible, no role="button", no tabindex, no aria-label
- Line 167: Login popup has role="dialog" and aria-modal="true" ✅
- Line 167: Missing aria-label on the login popup dialog
- Line 22: No aria-label on the .gstore-section-header section headings beyond h2
Dark Mode
- Line 857: color: rgba(255, 255, 255, 0.35) — hardcoded white rgba, breaks in light mode
- Line 860: background: rgba(255, 255, 255, 0.04) — hardcoded
- Line 398: background: rgba(0, 0, 0, 0.92) — hardcoded dark, no light mode support
- Line 621: Same hardcoded dark bg for nav
- Multiple hardcoded rgba(255,255,255,...) throughout (lines 477, 497, 524, 525, 605, 649, 651, 675, 676, 681, 885, etc.)
Overflow
- Line 615-617: .gstore-nav uses overflow-x: auto with hidden scrollbar ✅
- Line 866-874: .gstore-section-scroll uses overflow-x: auto with snap ✅
- Line 959-962: Card title uses -webkit-line-clamp: 2 ✅
Grid Layouts
- Line 865-874: Cards use flexbox with overflow-x: auto horizontal scroll — not CSS Grid with auto-fill. Acceptable for carousel pattern but not responsive grid.
Loading States
- Line 72-75: Loading state exists with animated dot ✅ — minimal but functional
Empty States
- No explicit empty state when search returns 0 results — visibleCategories filters to empty array but no message shown
Animations
- Line 899: Card hover transition: all 0.25s ✅
- Line 908: Card hover transform: translateY(-2px) ✅
- Line 1094-1102: Fade transition for overlay ✅
2. GrantsAuth.vue (223 lines)
Touch Targets
- Line 70-83: .auth-avatar — padding: 0.375rem 0.75rem = ~20px height — FAILS 44px minimum
- Line 118-131: .auth-signin — padding: 0.5rem 1rem = ~28px height — FAILS 44px minimum
- Line 172-185: .auth-dropdown-item — padding: 8px 10px = ~28px — FAILS 44px minimum
Accessibility
- Line 12: Avatar button uses <button> ✅ but missing aria-label (uses :title only, not accessible to screen readers)
- Line 23: Sign-out button has no aria-label
- Line 29: Sign-in button has no aria-label
- Line 17: Dropdown has no role="menu" or aria-expanded
Dark Mode
- Line 77: background: rgba(0, 0, 0, 0.6) — hardcoded dark
- Line 79: color: white — hardcoded
- Line 142: background: rgba(17, 17, 17, 0.95) — hardcoded dark
- Line 159: color: white — hardcoded
- Line 165: color: rgba(255, 255, 255, 0.4) — hardcoded
- Line 179: color: rgba(255, 255, 255, 0.7) — hardcoded
Overflow
- Line 111-116: Email text uses overflow: hidden; text-overflow: ellipsis; white-space: nowrap ✅
3. GrantDetailModal.vue (558 lines)
Responsive Design
- Line 11: Uses p-2 sm:p-4 md:p-6 — responsive ✅
- Line 13: max-w-[85vw] sm:max-w-[85vw] — responsive ✅ (but sm matches default, redundant)
- Line 14: p-4 sm:p-6 md:p-8 — responsive ✅
- Line 96-97: Grid uses grid-cols-1 md:grid-cols-3 ✅
Touch Targets
- Line 29-34: Edit button — px-3 py-1.5 text-[11px] — ~28px height — FAILS 44px minimum
- Line 35: Close button — p-2 = ~32px — CLOSE but FAILS 44px
- Line 84: Cancel button — px-4 py-2 = ~32px — FAILS 44px
- Line 85: Save button — px-4 py-2 = ~32px — FAILS 44px
- Line 165: Star vote buttons — text-lg sm:text-xl — no padding, rely on font size — may be too small
- Line 198-203: Delete comment button — p-0.5 = ~10px — FAILS 44px minimum
- Line 214-218: Comment submit button — px-3 py-2 = ~32px — FAILS 44px
- Line 224: Close button — px-4 py-2 = ~32px — FAILS 44px
Accessibility
- Line 11: Has role="dialog", aria-modal="true", aria-label="Grant detail" ✅
- Line 32: Edit button has aria-label="Edit grant" ✅
- Line 35: Close button has aria-label="Close" ✅
- No focus trap — when modal opens, focus is not trapped inside
- No Escape key handler — pressing Escape does not close the modal
- Line 165: Star buttons have :title but no aria-label
Glassmorphism
- Line 14: Sticky header uses bg-[var(--bg-secondary)]/95 backdrop-blur-sm ✅
- Line 98: Content cards use bg-white/[0.02] — consistent glass-like ✅
Dark Mode
- Uses CSS custom properties (--bg-secondary, --text-primary) throughout ✅
- Some hardcoded values: text-white on line 19, text-white/50 on line 26, etc. — but acceptable in dark-first design
- Line 498: .grant-type-badge.youth uses hardcoded #f472b6 — not a CSS variable
Typography
- Line 530-535: .edit-field > span uses font-size: 0.6rem — extremely small (9.6px), may be unreadable
- Line 505: .highlight-badge uses font-size: 0.6rem — same issue
Overflow
- Line 13: Modal uses max-h-[85vh] overflow-y-auto ✅
- Line 186: Comments list uses max-h-60 overflow-y-auto thin-scroll ✅
- Line 193: Author name uses truncate ✅
4. GrantEditModal.vue (179 lines)
Responsive Design
- Line 12: Uses p-4 only — no responsive padding
- Line 14: max-w-lg — fixed Tailwind class, acceptable
- Line 41: grid-cols-3 — no responsive grid, 3 columns on mobile will be cramped
Touch Targets
- Line 20: Close button — p-1.5 = ~24px — FAILS 44px minimum
- Line 69: Cancel button — px-3 py-1.5 = ~28px — FAILS 44px
- Line 70: Save button — px-3 py-1.5 = ~28px — FAILS 44px
Accessibility
- Line 12: Has role="dialog", aria-modal="true", aria-label="Edit grant" ✅
- Line 20: Close button has aria-label="Close" ✅
- No focus trap
- No Escape key handler
- Form inputs use <label> elements ✅
Glassmorphism
- Line 15: Header uses bg-[var(--bg-secondary)]/95 backdrop-blur-sm ✅
- No explicit backdrop-filter on the modal body
Dark Mode
- Line 158-168: .form-input uses var(--glass-border-light), var(--panel-border), var(--text-primary) — proper CSS vars ✅
Typography
- Line 151: .edit-field > span uses font-size: 0.6rem — 9.6px, too small
5. RegistryModal.vue (65 lines)
Responsive Design
- Line 13: max-w-6xl — large max width, responsive ✅
- Line 20: grid gap-3 sm:grid-cols-2 lg:grid-cols-3 — responsive grid ✅
Touch Targets
- Line 16: Close button — text-only button, no explicit padding — unclear touch target
- Line 31: View Details button — py-2 text-xs = ~28px — FAILS 44px minimum
Accessibility
- Line 12: Has role="dialog", aria-modal="true", aria-label ✅
- Line 16: Close button uses text as label — aria-label is i18n key ✅
- No focus trap
- No Escape key handler
Glassmorphism
- No glassmorphism — uses bg-black/90 for overlay but no backdrop-filter blur ❌
Overflow
- Line 12: overflow-y-auto on overlay ✅
6. GrantsFooter.vue (161 lines)
Responsive Design
- Line 54: min-height: 60vh — large fixed min-height
- Line 110: margin: 4rem 0 — fixed px, no responsive adjustment
- Line 156-160: Only 768px breakpoint, no tablet
Touch Targets
- Line 84-95: .footer-link — padding: 1rem 2rem = ~64px height ✅ passes 44px
- Line 36: Privacy policy link — no explicit padding, relies on inline text — may be small
Accessibility
- Line 8: Section has id="footer" ✅
- Line 14-18: External links use target="_blank" without rel="noopener" — security issue (line 14, 18)
- Line 36: Privacy link also missing rel="noopener" — security issue
- Footer has no <footer> semantic element — uses <section> instead
Glassmorphism
- No glassmorphism — footer is plain background ❌ (but may be intentional)
Dark Mode
- Uses hardcoded rgba(255,255,255,...) throughout — not dark-mode-aware ❌
- Line 129: color: var(--tectonic-white) — not a standard CSS variable from main.css
- Line 134: color: rgba(255,255,255,0.5) — hardcoded
- Line 140: color: rgba(255,255,255,0.4) — hardcoded
- Line 151: color: rgba(255, 255, 255, 0.3) — hardcoded
Typography
- Line 74: font-size: clamp(2.5rem, 8vw, 6rem) ✅ fluid title
- Line 126: font-size: 2rem — fixed for stat value
- Line 139: font-size: 0.7rem — small but acceptable for copyright
7. CrewSignupModal.vue (293 lines)
Responsive Design
- Line 14: Uses py-8 px-4 — responsive padding ✅
- Line 15: max-w-xl p-5 sm:p-8 — responsive ✅
- Line 54: grid-cols-2 — no responsive grid, cramped on mobile
- Line 79: grid-cols-[min(25vw,100px)_1fr] — responsive using min() ✅
- Line 106: grid-cols-3 — no responsive grid, 3 columns cramped on mobile
Touch Targets
- Line 22: Close button — p-1 = ~20px — FAILS 44px minimum
- Line 37: Back to portal button — px-5 py-2 = ~32px — FAILS 44px
- Line 46-49: Radio labels — p-3 = ~40px — CLOSE but FAILS 44px
- Line 56-59: Form inputs — px-3 py-2.5 = ~36px — FAILS 44px minimum for touch
- Line 129-132: Training radio labels — p-2.5 = ~36px — FAILS 44px
- Line 147: Submit button — py-3 = ~48px ✅ PASSES 44px
Accessibility
- Line 14: Modal uses @click.self for backdrop close ✅ but no role="dialog" or aria-modal ❌
- Line 22: Close button has aria-label="Close" ✅
- Line 43-51: Fieldset with legend for role selection ✅
- Line 47: Radio inputs use required attribute ✅
- No focus trap
- No Escape key handler
- Line 149: Submit text is hardcoded 'Submitting...' — not i18n
Glassmorphism
- Line 272-278: .glass class uses rgba(18, 18, 22, 0.95) + backdrop-filter: blur(24px) ✅
Dark Mode
- All colors hardcoded — text-white, text-white/40, bg-white/5, etc. — no CSS custom properties ❌
- Will not work in light mode at all
Overflow
- Line 14: overflow-y-auto on overlay ✅
8. ClaimGrantModal.vue (422 lines)
Responsive Design
- Line 142: padding: 16px — fixed, no responsive
- Line 149: max-width: 520px — fixed
- Line 159: padding: 24px 24px 0 — fixed
- No responsive breakpoints in this component at all ❌
Touch Targets
- Line 175-189: .claim-close-btn — padding: 4px 8px = ~24px — FAILS 44px minimum
- Line 356-372: .claim-cancel-btn — padding: 8px 16px = ~32px — FAILS 44px
- Line 374-398: .claim-submit-btn — padding: 8px 20px = ~32px — FAILS 44px
Accessibility
- Line 4: Has role="dialog", aria-modal="true" ✅
- Line 11: Close button has aria-label="Close" ✅
- No focus trap
- No Escape key handler
- Line 36-42: Textarea has no associated <label> element — uses separate <label> tag but not for attribute ❌
- Line 43: Character count not announced to screen readers
Glassmorphism
- Line 133-143: Overlay uses backdrop-filter: blur(8px) ✅
- Line 146: Modal uses hardcoded background: #111 — not glassmorphism ❌
Dark Mode
- All colors hardcoded — #fff, rgba(255,255,255,...), #111 ❌
- Line 165: color: #fff — hardcoded
- Line 382: color: #000 on submit button — hardcoded
Overflow
- No overflow handling on the modal body — long content could overflow ❌
9. ReviewClaimModal.vue (496 lines)
Responsive Design
- Same issues as ClaimGrantModal — all fixed px values, no responsive breakpoints ❌
- Line 165-167: padding: 16px — fixed
- Line 173: max-width: 520px — fixed
- Line 182-184: padding: 24px 24px 0 — fixed
Touch Targets
- Line 199-213: .review-close-btn — padding: 4px 8px = ~24px — FAILS 44px
- Line 305-321: Decision buttons — padding: 12px 16px = ~44px ✅ PASSES 44px (border adds height)
- Line 422-438: Cancel button — padding: 8px 16px = ~32px — FAILS 44px
- Line 440-452: Submit button — padding: 8px 20px = ~32px — FAILS 44px
- Line 373-385: Change button — no explicit padding — FAILS 44px
Accessibility
- Line 4: Has role="dialog", aria-modal="true" ✅
- Line 11: Close button has aria-label="Close" ✅
- No focus trap
- No Escape key handler
Glassmorphism
- Line 157-167: Overlay uses backdrop-filter: blur(8px) ✅
- Line 169: Modal uses hardcoded background: #111 ❌
Dark Mode
- All colors hardcoded ❌ — same issue as ClaimGrantModal
10. CreateGrantModal.vue (428 lines)
Responsive Design
- Line 423-427: Has @media (max-width: 640px) breakpoint for grid columns ✅
- Line 197: padding: 16px — fixed
- Line 204: max-width: 600px — fixed
- Line 215: padding: 24px 24px 0 — fixed
- No tablet breakpoint
Touch Targets
- Line 235-249: .create-close-btn — padding: 4px 8px = ~24px — FAILS 44px
- Line 308: Inputs use padding: 8px 12px = ~32px — FAILS 44px
- Line 356-372: Cancel button — padding: 8px 16px = ~32px — FAILS 44px
- Line 374-398: Submit button — padding: 8px 20px = ~32px — FAILS 44px
Accessibility
- Line 4: Has role="dialog", aria-modal="true" ✅
- Line 11: Close button has aria-label="Close" ✅
- No focus trap
- No Escape key handler
- Form uses <label> elements ✅
- Line 57-63: Select options are hardcoded English — not i18n ❌
- Line 84-89: Select options hardcoded English ❌
Glassmorphism
- Line 188-198: Overlay uses backdrop-filter: blur(8px) ✅
- Line 200-209: Modal uses hardcoded background: #111 ❌
Dark Mode
- All colors hardcoded ❌
11. pages/eg-grants/index.vue (1371 lines)
Responsive Design
- Line 63: px-[10%] — responsive using percentage ✅
- Line 983-986: .impact-grid uses grid-template-columns: 1fr 1fr — no responsive breakpoint until 768px
- Line 1360-1370: Has 768px breakpoint for grid collapse ✅
- Line 1147: .impact-card uses flex: 0 0 240px — fixed width, scrollable carousel ✅
- Line 1264: padding: 8rem 10% — large fixed padding
- No tablet breakpoint (1024px) for intermediate layouts
Touch Targets
- Line 38: Crew signup button — px-3 py-2 text-xs = ~32px — FAILS 44px
- Line 39: Continue as viewer button — px-3 py-2 text-xs = ~32px — FAILS 44px
- Line 54: Cancel button — px-3 py-1.5 text-xs = ~28px — FAILS 44px
- Line 55: Sign out button — px-3 py-1.5 text-xs = ~28px — FAILS 44px
- Line 147-150: CTA button — padding: 1rem 2rem = ~48px ✅ PASSES
- Line 170-173: Full screen toggle — padding: 0.55rem 1.1rem = ~28px — FAILS 44px
Accessibility
- Line 66: Uses v-html for hero description — XSS risk if content is user-generated
- Line 94: Hidden SVG uses class="sr-only" ✅
- Line 155: Uses v-html for contact email — XSS risk
- Line 63: Sections lack aria-label attributes
- No skip navigation link
Glassmorphism
- Line 1233: .grants-copy uses backdrop-filter: blur(16px) ✅
- Line 1149-1151: .impact-card uses backdrop-filter: blur(20px) ✅
Dark Mode
- Line 8: bg-[#08080a] — hardcoded dark bg ❌
- Uses var(--accent), var(--tectonic-white) etc. ✅ but some sections use hardcoded colors
Typography
- Line 957: font-size: clamp(2rem, 5vw, 4rem) ✅ fluid
- Line 966: font-size: clamp(1.5rem, 4vw, 2.5rem) ✅ fluid
- Line 1053: font-size: clamp(2.5rem, 4vw, 3.5rem) ✅ fluid
- Line 1108: font-size: 1.05rem — fixed for quote text
Overflow
- Line 8: overflow-hidden on root div ✅
- Line 1139-1144: Impact track uses overflow-x: auto with snap ✅
12. pages/eg-grants/fullscreen.vue (740 lines)
Responsive Design
- Line 519: padding: 0 2rem — fixed
- Line 736: Has 768px breakpoint for container padding ✅
- Line 737-738: Hides badge and back button text on mobile ✅
Touch Targets
- Line 21: Cancel button — px-3 py-1.5 text-xs = ~28px — FAILS 44px
- Line 22: Sign out button — px-3 py-1.5 text-xs = ~28px — FAILS 44px
- Line 47-50: Back button — padding: 0.35rem 0.75rem = ~20px — FAILS 44px
Accessibility
- Line 32: Logo link uses <NuxtLink> ✅
- Line 47: Back link uses <NuxtLink> ✅
- No skip navigation link
Glassmorphism
- Line 17: .glass-panel uses backdrop-filter: blur(20px) ✅
- Line 508-514: Glass panel definition ✅
- Line 528-531: Header uses backdrop-filter: blur(24px) ✅
Dark Mode
- Line 8: bg-black — hardcoded ❌ but fullscreen mode likely always dark
- Line 504: background: #000 — hardcoded
13. FormField.vue (27 lines)
Accessibility
- Line 10: Label uses <label> element ✅
- Line 14: <slot /> for input — no automatic id/for association ❌
Typography
- Line 10: text-[11px] — ~11px, very small
- Line 15: text-[10px] — ~10px, extremely small for hint text
14. ClaimsTable.vue (396 lines)
Responsive Design
- Line 381-395: Has 640px breakpoint for mobile layout ✅
Touch Targets
- Line 9-18: Filter buttons — padding: 5px 12px = ~26px — FAILS 44px
- Line 51-54: Review button — padding: 5px 12px = ~26px — FAILS 44px
Accessibility
- Line 5: Heading uses <h3> ✅
- Line 9-18: Filter buttons use <button> ✅
- Line 51: Review button uses <button> ✅
- Line 28: Empty state icon has no aria-hidden ❌
Glassmorphism
- No glassmorphism — uses solid rgba(255,255,255,0.03) backgrounds ❌ (but consistent with parent context)
Dark Mode
- All colors hardcoded ❌ — rgba(255,255,255,...), #fff, #00ff85, #f87171, #facc15
Overflow
- Line 271-278: Project name uses white-space: nowrap; overflow: hidden; text-overflow: ellipsis ✅
Cross-Cutting Issues Summary
Critical Issues
Category
Touch targets < 44px
No focus trap in modals
No Escape key in modals
Hardcoded dark colors (no light mode)
Interactive <div> elements (not keyboard accessible)
Missing rel="noopener" on external links
v-html XSS risk
Font sizes < 10px (unreadable)
Fixed px spacing (no clamp())
No empty state for search results
No skeleton loaders
Hardcoded English in select options
Files with No Responsive Breakpoints
- ClaimGrantModal.vue
- ReviewClaimModal.vue
- FormField.vue
Files with No Glassmorphism (inconsistent with design system)
- RegistryModal.vue
- ClaimGrantModal.vue (modal body)
- ReviewClaimModal.vue (modal body)
- CreateGrantModal.vue (modal body)
- ClaimsTable.vue
Files Completely Incompatible with Light Mode
- GrantsAuth.vue
- CrewSignupModal.vue
- ClaimGrantModal.vue
- ReviewClaimModal.vue
- CreateGrantModal.vue
- ClaimsTable.vue
