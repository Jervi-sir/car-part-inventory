import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import React from 'react';
import { AppSidebar } from './sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggleDropdown } from '@/components/theme-toggle-dropdown';

type ClientLayoutProps = {
  children: React.ReactNode;
  title?: string;
};

export const AdminLayout = ({ children, title }: ClientLayoutProps) => {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="sidebar" />
      <SidebarInset>
        <SiteHeader title={title} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              { children }
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

function SiteHeader({ title }: { title?: string }) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title ?? "Documents"}</h1>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggleDropdown />
          {/* <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(examples)/dashboard"
              rel="noopener noreferrer"
              target="_blank"
              className="dark:text-foreground"
            >
              GitHub
            </a>
          </Button> */}
        </div>
      </div>
    </header>
  );
}
