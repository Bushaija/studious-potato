// components/sidebar/app-sidebar-server.tsx (Server Component)
import { getNavigationForUser } from '@/constants/nav-data';
import { AppSidebarClient } from './app-sidebar-client';
import { useSession } from '@/components/providers/session-provider';

export default function AppSidebar() {
  const { user } = useSession();
  const navItems = user ? getNavigationForUser(user as any) : [];
  return <AppSidebarClient navItems={navItems} user={user as any || null} />;
}