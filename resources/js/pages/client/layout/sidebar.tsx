
import * as React from "react"
import {
  Command,
  Container,
  SearchIcon,
  SettingsIcon,
  ShoppingCartIcon,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, } from "@/components/ui/sidebar"
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Link, usePage } from "@inertiajs/react"
import { cn } from "@/lib/utils"

// This is sample data.
const data = {
  navMain: [
    {
      title: "Articles",
      url: route('client.parts.page'),
      icon: SearchIcon,
      isActive: true,
    },
    {
      title: "Panier",
      url: route('client.checkout.page'),
      icon: ShoppingCartIcon,
    },
    {
      title: "Commandes",
      url: route('client.orders.page'),
      icon: Container,
    },
    {
      title: "Paramètres",
      url: route('client.settings.page'),
      icon: SettingsIcon,
    },
  ],

}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { url } = usePage();

  return (
    <Sidebar collapsible="icon" {...props} >
      <SidebarHeader>
        <SiteLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Services</SidebarGroupLabel>
          <SidebarMenu>
            {data.navMain.map((item) => {
              // convert absolute URL to just pathname
              const itemPath = new URL(item.url, window.location.origin).pathname
              const isActive = url.startsWith(itemPath)

              return (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={item.isActive}
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <Link href={item.url}>
                        <SidebarMenuButton
                          tooltip={item.title}
                          className={cn(
                            "cursor-pointer",
                            isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                          )}
                        >
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </Link>
                    </CollapsibleTrigger>
                  </SidebarMenuItem>
                </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}



export function SiteLogo() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                {/* <Command className="size-4" color="black" /> */}
                <img src="/images/logo-rafiki-motors-2.png" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Pièce automobile.</span>
                <span className="truncate text-xs">Inventaire</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
