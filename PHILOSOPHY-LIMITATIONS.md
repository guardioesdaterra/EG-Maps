# EG-Maps: Philosophy, Limitations, and Improvements

## Architecture Philosophy

EG-Maps is a **static-first, map-centric** platform designed to visualize Earth Guardians crews globally. The current architecture reflects this:

- **Nuxt 3 with SSR + SSG** — Pages are pre-rendered for performance and SEO, with client-side hydration for interactive map features
- **MapLibre GL** — Vector tile-based maps with clustering, geolocation, and WebGL rendering
- **Supabase** — Backend-as-a-service for authentication and grants submission, though minimally integrated
- **Vuetify** — Material Design components for consistent UI across info panels, stats, and overlays

The system prioritizes **data availability over data fidelity** — all crew data is baked into the build, ensuring the site works offline and loads instantly, but at the cost of stale information.

---

## Current Limitations

### 1. Static Data Pipeline

**Problem**: Crew data is entirely hardcoded in `lib/crew-data.ts` (131 crews, 1241 members, 47 countries, 7 regions). Any change to crew membership requires editing a JSON file, rebuilding, and redeploying.

**Impact**: 
- Crew members cannot self-update their information
- New crews require developer intervention
- Data is stale by the time it's deployed

**Mitigation**: Supabase integration would solve this, but is currently bare-bones.

### 2. Supabase Integration Gaps

**Critical Issues**:
- `lib/supabase.ts` creates client with silent failure if env vars missing
- `composables/useSupabase.ts` has memory leak risk — auth subscription never unsubscribed
- `composables/useSupabaseAuth.ts` uses email-suffix role check (`@earthguardians.org`) — trivially spoofable
- No server-side validation in grants portal
- Edge function calls in `useDataDownload.ts` may not work as designed

**Missing Features**:
- No crew member CRUD (create, read, update, delete)
- No role-based access control beyond email suffix
- No audit logging for data changes

### 3. Monolithic Components

**`UnifiedMap.vue` (~2800 lines)** handles three completely different datasets with massive switch/case blocks:
- Crews map (clustering, markers, info panels)
- Grants portal (application cards, submission forms)
- Observatory of Vulcan (mining process visualization)

**`eg-grants/index.vue` (~1776 lines)** mixes concerns:
- Data fetching
- Form handling
- Status tracking
- Payment integration
- Admin review panels

### 4. i18n Inconsistencies

**Missing Keys**: 5 locales (ar, ja, hi, zh, nl, de, fr) are missing ~20 keys each, causing silent fallback to English for:
- `observatory.layers.cultural`
- `observatory.layers.waterBodies`
- `observatory.culturalLayers`
- `observatory.contribution`

**Duplicate Keys**: `en.json` had duplicate `info` blocks (resolved in this review).

### 5. Performance Issues

**`UnifiedMap.vue`**: 
- `requestAnimationFrame` loop in `RedeCorporativa.vue` creates potential memory leaks
- No cleanup on component destroy
- Massive conditional rendering with switch/case

**`useGrants.ts`**: 
- Catch blocks had implicit `any` type (fixed)
- No retry logic for failed API calls

**`GlobeView.vue`**: 
- Missing wheel handler pause — 3D globe animation continues when user scrolls away

### 6. Security Anti-Patterns

**Authentication**:
- Email-suffix role check (`@earthguardians.org`) is trivially spoofable
- No JWT verification on server side
- No rate limiting on API endpoints

**Grants Portal**:
- No server-side validation
- No file upload sanitization
- No CSRF protection

### 7. Accessibility Issues

- No ARIA labels on map controls
- No keyboard navigation for map markers
- No screen reader support for 3D globe
- No color contrast validation for status badges

---

## Improvement Roadmap

### Phase 1: Stabilize (Weeks 1-2)

1. **Fix memory leaks**: Add cleanup to `useSupabase.ts` auth subscription
2. **Add null checks**: Fix `RedeCorporativa.vue` crashes with proper null guards
3. **Normalize scoring**: Improve `game-icons-map.ts` algorithm consistency
4. **Complete i18n**: Add missing keys to all 10 locales
5. **Update documentation**: Refresh README with current structure

### Phase 2: Refactor (Weeks 3-4)

1. **Split `UnifiedMap.vue`**:
   - `CrewsMap.vue` — Crew-specific logic
   - `GrantsMap.vue` — Grants portal logic
   - `ObservatoryMap.vue` — Vulcan mining visualization
2. **Extract form logic** from `eg-grants/index.vue` into composable
3. **Enforce TypeScript strict mode** — already enabled in `nuxt.config.ts`, but add `eslint-plugin-vue` rules to catch remaining `any` types
4. **Implement proper auth** with JWT verification and role-based access

### Phase 3: Enhance (Weeks 5-8)

1. **Supabase integration**:
   - `crew_members` table with RLS policies
   - Edge functions for CRUD operations
   - Real-time subscriptions for live updates
2. **Grants portal**:
   - Server-side validation
   - File upload with virus scanning
   - Payment webhook handlers
3. **Observatory**:
   - Cultural layer integration
   - Water body visualization
   - Contribution tracking

### Phase 4: Scale (Months 3-6)

1. **Multi-region deployment**:
   - CDN for static assets
   - Edge functions for API calls
   - Database replication
2. **Analytics dashboard**:
   - Crew growth tracking
   - Grant application metrics
   - Mining process updates
3. **Mobile app**:
   - React Native wrapper
   - Offline-first data sync
   - Push notifications for crew updates

---

## Technical Debt Inventory

| Component | Issue | Priority | Effort |
|-----------|-------|----------|--------|
| `UnifiedMap.vue` | Monolithic component | High | 2 weeks |
| `useSupabase.ts` | Memory leak | High | 1 day |
| `useSupabaseAuth.ts` | Insecure role check | High | 3 days |
| `eg-grants/index.vue` | Mixed concerns | Medium | 1 week |
| `GlobeView.vue` | Missing pause | Low | 1 hour |
| `RedeCorporativa.vue` | Null crashes | Medium | 2 hours |
| `game-icons-map.ts` | Scoring inconsistency | Low | 1 day |
| i18n keys | Missing translations | Medium | 2 days |
| `lib/crew-data.ts` | Static data | High | 2 weeks |
| `lib/supabase.ts` | Silent failure | Medium | 1 day |

---

## Recommendations

### Immediate Actions

1. **Fix memory leak** in `useSupabase.ts` (already done in this review)
2. **Implement proper auth** with Supabase RLS and JWT verification
3. **Split `UnifiedMap.vue`** into domain-specific components
4. **Add ESLint rules** for memory leak detection

### Long-term Strategy

1. **Migrate to Supabase** for all data operations
2. **Implement real-time subscriptions** for live crew updates
3. **Add comprehensive testing** (unit, integration, e2e)
4. **Set up CI/CD** with automated security scanning

### Data Architecture

1. **Normalize crew data** into relational tables
2. **Add audit logging** for all changes
3. **Implement version control** for data migrations
4. **Create backup/restore procedures**

---

## Conclusion

EG-Maps is a solid foundation with clear vision, but suffers from typical rapid-prototype issues: static data, monolithic components, and incomplete integrations. The roadmap above provides a structured path to production readiness, with security and maintainability as primary concerns.

The most critical issue is the **static crew data pipeline** — solving this unlocks real-time updates, self-service crew management, and scalable growth. The Supabase integration should be prioritized above all other improvements.