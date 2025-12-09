# Reel Rep Training App - AI Agent Instructions

## Project Overview
**Reel Rep** is a Hebrew-language fitness training app built with **Expo + React Native** for iOS/Android. It's a multi-tenant system supporting users, coaches, and admins with class bookings, workout logging, achievements, and a gamified "plates" currency system.

## Tech Stack
- **Framework**: Expo Router (file-based routing) + React Native
- **State Management**: React Query + Context API (custom contexts via `@nkzw/create-context-hook`)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Key Libraries**: Lucide React Native (icons), Nativewind, React Native Chart Kit
- **Language**: TypeScript (strict)

## Architecture Patterns

### Context-Based State Management
The app uses 5 core Context providers (all in `contexts/`):
- **AuthContext**: Session management, user profile, role-based access (admin/coach/user)
- **WorkoutContext**: Local-first workout logging with AsyncStorage persistence
- **ClassesContext**: Class schedules, bookings, cancellations (with 6-hour cancellation deadline)
- **ShopContext**: In-app shop items and transactions
- **AchievementsContext**: Challenges, badges, progression tracking

**Pattern**: Contexts export custom hooks via `createContextHook()` (returns `[Provider, useHook]`). Use at `app/_layout.tsx` root.

### Data Flow
1. **Supabase** is primary backend (auth, profiles, health sync)
2. **AsyncStorage** handles offline-first workout data
3. **React Query** orchestrates async operations with caching
4. No Redux/Zustand—contexts are sufficient for app scope

### RTL (Right-to-Left) Support
App is **Hebrew-first** with RTL enabled globally in `app/_layout.tsx`:
```tsx
if (Platform.OS !== 'web') {
  I18nManager.forceRTL(true);
}
```
**Text strings**: Use `hebrew` constant from `constants/hebrew.ts` (contains all UI labels). Direct Hebrew strings are acceptable but prefer the constant for consistency.

## Key File Locations

| What | Where |
|------|-------|
| Types (User, Workout, Class, etc) | `constants/types.ts` |
| Theme colors + design tokens | `constants/colors.ts` |
| Hebrew text strings | `constants/hebrew.ts` |
| Mock data (for offline) | `constants/mockData.ts` |
| Supabase client setup | `constants/supabase.ts` |
| Authentication flow | `app/auth.tsx` + `contexts/AuthContext.tsx` |
| Main UI pages | `app/(tabs)/` (home, classes, shop, profile) |
| Admin dashboard | `app/admin/` |
| Plates currency system | `lib/plates-manager.ts` |
| Health integration (HealthKit/Health Connect) | `lib/services/health-integration.ts` |
| Push notifications | `lib/services/push-notifications.ts` |
| CRM + Green Invoice API | `lib/services/crm-manager.ts` |

## Critical Patterns & Conventions

### Styling
- Uses `StyleSheet.create()` for performance (not inline)
- Color tokens from `Colors` constant (never hardcode hex values)
- Safe area padding via `useSafeAreaInsets()` from `react-native-safe-area-context`
- Modal presentations use Expo Router's `presentation: "modal"` option

### User Roles & Permissions
- **Admin**: Unrestricted access, financial dashboard, client management
- **Coach**: Can view/manage their classes
- **User**: Standard member, can book classes and log workouts
Check with `useAuth().isAdmin` or `user.role` before rendering admin features.

### Class Booking Rules
- **Cancellation deadline**: 6 hours before class start
- **Late cancellation**: Charges user, increments `lateCancellations` counter
- **Account blocking**: 3 late cancellations → 3-day block on `blockEndDate`
- **Class switching**: Minimum 1 hour before class (vs 6 hours for cancel)

### Plates Currency (Gamification)
- `PlatesManager` class in `lib/plates-manager.ts` handles all transactions
- Plates earned from workouts, achievements, referrals
- Redeemable for discounts (percentage, fixed amount, or plates value)
- Transactions tracked in Supabase with `earned|spent|bonus|refund` types
- Always send notifications after earned/bonus transactions

### Health Integration
- `HealthIntegrationService` wraps iOS HealthKit + Android Health Connect
- Sync health metrics → award plates for activity milestones
- Requires platform-specific setup (see `SETUP_GUIDE.md`)
- Data synced to `health_data` table in Supabase

### Subscription Model
User subscriptions have:
- `type`: 'basic' | 'premium' | 'vip'
- `status`: 'active' | 'expired' | 'cancelled'
- `classesPerMonth` / `classesUsed`
- `startDate` / `endDate` (with progress bar UI)

## Development Workflow

### Install & Run
```bash
bun install          # Use Bun, not npm
bun run start        # Tunnel mode for testing
bun run start-web    # Web preview
bun run ios          # Custom iOS build
bun run android      # Custom Android build
```

### Environment Setup
Create `.env.local` (or `.env`) with:
```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
EXPO_PUBLIC_GREEN_INVOICE_API_KEY=<if-using-financial-features>
```

### Testing
- No automated test suite documented
- Manual testing via Expo Go (phone) or `bun run start-web` (browser)
- Test as different roles by modifying `AuthContext` mock data

## Common Implementation Patterns

### Adding a New Page
1. Create file in `app/` or `app/(tabs)/` following Expo Router naming
2. Import layout styles from existing pages
3. Use context hooks: `const { data } = useContext()`
4. Wrap modals with `presentation: "modal"` in `_layout.tsx`

### Syncing Data to Supabase
```tsx
const { mutate } = useMutation({
  mutationFn: async (data) => {
    const { error } = await supabase.from('table').insert(data);
    if (error) throw error;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['key'] })
});
```

### Async Storage (Offline-First)
```tsx
const stored = await AsyncStorage.getItem('key');
const data = stored ? JSON.parse(stored) : mockData;
```

## Known Limitations & Gotchas

1. **No custom native modules without EAS builds**: Features like face ID, in-app purchases need development builds (see `README.md` for details)
2. **Health Connect Android 14+**: May not be available on older devices
3. **Infinite RLS recursion**: If you see "42P17" error in auth, check Supabase RLS policies (documented in AuthContext)
4. **AsyncStorage key scoping**: Keys are user-specific to avoid conflicts
5. **RTL TextInput**: May have alignment quirks—test on device

## External Integrations

- **Green Invoice**: Financial reporting + invoice generation (API key required)
- **Twilio WhatsApp**: Notifications via WhatsApp (credentials in env vars)
- **Supabase Realtime**: Optional for live class updates (not currently used)

## Debugging Tips

- Check `console.log` output in Expo CLI terminal (prefixed with component names)
- Use React Query DevTools to inspect cache state (if installed)
- Test RTL by toggling `I18nManager.forceRTL()` on-device
- Verify Supabase connection: check `supabase.ts` is initialized and auth query succeeds

## When to Ask for Clarification

This codebase is stable but has some undocumented behaviors:
- Exact Supabase schema details (infer from context queries)
- Green Invoice API integration specifics (check `SETUP_GUIDE.md`)
- Mock data usage vs real Supabase (appears to toggle based on `enable_debug` flag if present)
- EAS build configuration details (see `eas-docs/` folder)

---

**Last Updated**: December 2025  
**Target Users**: AI agents, external developers, CI/CD systems
