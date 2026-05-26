import { DashboardScreen } from '../components/dashboard/DashboardScreen';

/**
 * Home route. Renders the dashboard surface (project list, empty state, or
 * loading/error). First-time users with no projects get a centered empty
 * state with a primary CTA into the wizard at `/new` — no automatic
 * redirect, so the URL stays stable and bookmarkable.
 */
export default function Page() {
  return <DashboardScreen />;
}
