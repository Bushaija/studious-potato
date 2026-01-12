import KBar from '@/components/kbar';
import { AppSidebarClient } from '@/components/layout/app-sidebar-client';
import Header from '@/components/layout/header';
import { Toaster } from '@/components/ui/sonner';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { ReactNode } from 'react';
import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { getNavigationForUser } from '@/constants/nav-data';
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { SessionProvider } from '@/components/providers/session-provider';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Dashboard',
};

interface DashboardClientLayoutProps {
  children: ReactNode;
  defaultOpen: boolean | undefined;
  sessionData: any;
}

async function DashboardClientLayout({
  children,
  defaultOpen,
  sessionData,
}: DashboardClientLayoutProps) {
  const navItems = sessionData?.user
    ? getNavigationForUser(sessionData.user)
    : []

  return (
    <SessionProvider sessionData={sessionData}>
      <KBar>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebarClient 
            navItems={navItems}
            user={sessionData?.user ?? null}
            />
          <SidebarInset>
            <div className="sticky top-0 z-50 bg-background">
              <Header />
            </div>
            {/* Global toast notifications for all dashboard routes */}
            <Toaster richColors closeButton position="bottom-right" />
            <div className='p-4'>
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </KBar>
    </SessionProvider>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const { data: session } = await getSession(headersList);

  // Redirect to sign-in if not authenticated
  if (!session) {
    redirect('/sign-in');
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar:state')?.value === 'true';

  return (
    <DashboardClientLayout defaultOpen={defaultOpen} sessionData={session}>
      <NuqsAdapter>
        {children}
      </NuqsAdapter>
    </DashboardClientLayout>
  );
}