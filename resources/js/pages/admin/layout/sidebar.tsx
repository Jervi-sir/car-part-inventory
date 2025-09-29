import * as React from "react"
import { BaggageClaim, CarFront, Command, Component, Factory, ImportIcon, Package, Puzzle, UserIcon } from "lucide-react"
import { Link, usePage } from "@inertiajs/react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import AnalyticsController from "@/actions/App/Http/Controllers/Admin/AnalyticsController"
import ManufacturerController from "@/actions/App/Http/Controllers/Admin/ManufacturerController"
import PartController from "@/actions/App/Http/Controllers/Admin/PartController"
import VehicleModelController from "@/actions/App/Http/Controllers/Admin/VehicleModelController"
import VehicleBrandController from "@/actions/App/Http/Controllers/Admin/VehicleBrandController"
import ImportPartsController from "@/actions/App/Http/Controllers/Admin/ImportPartsController"
import AdCreativeApiController from "@/actions/App/Http/Controllers/Admin/AdCreativeApiController"
import UserController from "@/actions/App/Http/Controllers/Admin/UserController"
import OrderController from "@/actions/App/Http/Controllers/Admin/OrderController"

// Sample data without hardcoded isActive
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    { title: "Analyses", url: AnalyticsController.index().url, icon: Factory },
    { title: "Constructeurs", url: ManufacturerController.page().url, icon: Factory },
    { title: "Marques de véhicules", url: VehicleBrandController.page().url, icon: CarFront },
    { title: "Modèles de véhicules", url: VehicleModelController.page().url, icon: Package },
    { title: "Pièces", url: PartController.page().url, icon: Puzzle },
    { title: "Commandes", url: OrderController.page().url, icon: BaggageClaim },
    { title: "Utilisateurs", url: UserController.page().url, icon: UserIcon },
    { title: "Importations", url: ImportPartsController.index().url, icon: ImportIcon },
    { title: "Créations publicitaires", url: AdCreativeApiController.page().url, icon: ImportIcon },
],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { url } = usePage();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SiteLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {data.navMain.map((item) => {
              // convert absolute URL to just pathname
              const itemPath = new URL(item.url, window.location.origin).pathname
              const isActive = url.startsWith(itemPath)

              return (
                <Collapsible key={item.title} asChild defaultOpen={isActive}>
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
                <Command className="size-4" color="black" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Car Part</span>
                <span className="truncate text-xs">Admin</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
