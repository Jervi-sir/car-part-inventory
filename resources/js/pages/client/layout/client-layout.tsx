import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import React from 'react';
import { AppSidebar } from './sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggleDropdown } from '@/components/theme-toggle-dropdown';
import { Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type ClientLayoutProps = {
  children: React.ReactNode;
  title?: string;
};

export const ClientLayout = ({ children, title }: ClientLayoutProps) => {
  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={title} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-4">
              {children}
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
          <CartSummary  />
          <ThemeToggleDropdown />
        </div>
      </div>
    </header>
  );
}

type CartShared = {
  id: number;
  lines_count: number;
  qty_total: number;
  subtotal: string;
  grand_total: string;
} | null;


function CartSummary() {
  const { props } = usePage<{ cart: CartShared }>();
  const cart = props.cart;
  function formatDZD(amount: number) {
    return `${amount.toLocaleString("fr-DZ")} DZD`;
  }

  // If no cart yet, show nothing (or a subtle placeholder)
  if (!cart) return null;

  const count = cart.lines_count ?? 0;
  const qty_total = cart.qty_total ?? 0;
  const total = Number(cart.grand_total ?? 0);

  return (
    <Link href={route('client.checkout.page')}>
      <Button variant="outline" size="default" className="gap-2">
        <ShoppingCart className="h-4 w-4" />
        <span className="hidden sm:inline">Cart</span>
        <Badge variant="secondary" className="ml-1">{qty_total}</Badge>
        <span className="ml-2 text-muted-foreground">{formatDZD(total)}</span>
      </Button>
    </Link>
  );
}
