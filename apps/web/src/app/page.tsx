import { redirect } from 'next/navigation';

/**
 * Root index route page component.
 * Automatically performs a client/server redirect to the creation onboarding flow.
 *
 * @component
 * @returns Nothing, triggers Next.js navigation redirect side effect.
 */
export default function Page() {
  redirect('/new');
}
