"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  PackagePlus,
  PackageMinus,
  Factory,
  Package,
  ArrowLeftRight,
  ClipboardList,
  Boxes,
  Ruler,
  Warehouse,
  FileUp,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"

const navGroups = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Transactions",
    items: [
      { title: "Inbound", href: "/inbound", icon: PackagePlus },
      { title: "Outbound", href: "/outbound", icon: PackageMinus },
    ],
  },
  {
    label: "Production",
    items: [
      { title: "Production Orders", href: "/production-orders", icon: Factory },
    ],
  },
  {
    label: "Inventory",
    items: [
      { title: "Stock Summary", href: "/inventory/summary", icon: ClipboardList },
      { title: "Stock Levels", href: "/inventory", icon: Package },
      {
        title: "Stock Movements",
        href: "/inventory/movements",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    label: "Master Data",
    items: [
      { title: "Items", href: "/master/items", icon: Boxes },
      { title: "UOM", href: "/master/uom", icon: Ruler },
      { title: "UOM Conversions", href: "/master/uom/conversions", icon: ArrowLeftRight },
      { title: "Warehouses", href: "/master/warehouses", icon: Warehouse },
    ],
  },
  {
    label: "Utilities",
    items: [
      { title: "Import Data", href: "/import", icon: FileUp },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Warehouse className="h-6 w-6" />
          <span className="text-lg font-semibold">Sutandi MES</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href + "/"))

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t px-4 py-3">
        {session?.user ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {session.user.name ?? "User"}
            </span>
            <span className="text-xs text-muted-foreground">
              {session.user.role ?? "Operator"}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Not signed in</span>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
