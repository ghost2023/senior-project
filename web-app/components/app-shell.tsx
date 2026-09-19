"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  IconLayoutDashboard,
  IconUsers,
  IconUserCircle,
  IconLogout,
  IconBell,
  IconTerminal2,
  IconCalendar,
  IconAlertCircle,
  IconSparkles,
  IconClipboardList,
  IconTrendingUp,
  IconFileSpreadsheet,
  IconShieldCheckered,
  IconChartBar,
  IconMicroscope,
  IconUserPlus,
  IconBuildingCommunity,
  IconAdjustments,
  IconHistory,
  IconFileText,
  IconClipboardCheck,
} from "@tabler/icons-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  teacher: "Teacher",
  faculty_admin: "Faculty Administrator",
  admin: "Administrator",
};

const adminNavItems: NavItem[] = [
  { title: "Faculty Overview", href: "/admin", icon: IconChartBar },
  { title: "Performance", href: "/admin/performance", icon: IconTrendingUp },
  { title: "Attendance", href: "/admin/attendance", icon: IconBuildingCommunity },
  { title: "Faculty & Teachers", href: "/admin/faculty", icon: IconMicroscope },
  { title: "User Management", href: "/admin/users", icon: IconUserPlus },
  { title: "Academic Structure", href: "/admin/academic-structure", icon: IconClipboardList },
  { title: "Risk Review", href: "/admin/risk-review", icon: IconShieldCheckered },
  { title: "Alert Thresholds", href: "/admin/alert-config", icon: IconAdjustments },
  { title: "ML Models", href: "/admin/models", icon: IconSparkles },
  { title: "Audit Log", href: "/admin/audit-log", icon: IconHistory },
];

const roleNavItems: Record<Role, NavItem[]> = {
  student: [
    { title: "Dashboard", href: "/student", icon: IconLayoutDashboard },
    { title: "Grades", href: "/student/grades", icon: IconClipboardList },
    { title: "Attendance", href: "/student/attendance", icon: IconCalendar },
    { title: "Predictions", href: "/student/predictions", icon: IconSparkles },
    { title: "Risk Alerts", href: "/student/risks", icon: IconAlertCircle },
    { title: "Recommendations", href: "/student/recommendations", icon: IconClipboardCheck },
    { title: "Reports", href: "/student/reports", icon: IconFileText },
  ],
  teacher: [
    { title: "Class Overview", href: "/teacher", icon: IconLayoutDashboard },
    { title: "Students", href: "/teacher/students", icon: IconUsers },
    { title: "Manage Grades", href: "/teacher/grades", icon: IconFileSpreadsheet },
    { title: "Attendance", href: "/teacher/attendance", icon: IconCalendar },
    { title: "At-Risk Students", href: "/teacher/risks", icon: IconShieldCheckered },
    { title: "Analytics", href: "/teacher/analytics", icon: IconTrendingUp },
    { title: "Reports", href: "/teacher/reports", icon: IconFileText },
  ],
  faculty_admin: adminNavItems,
  admin: adminNavItems,
};

interface AppShellProps {
  children: React.ReactNode;
  role: Role;
  userName: string;
  userEmail: string;
}

export function AppShell({ children, role, userName, userEmail }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentNav = roleNavItems[role] ?? adminNavItems;
  const isFacultyAdminRole = role === "faculty_admin" || role === "admin";

  const activeTitle =
    currentNav.find((item) =>
      item.href === `/${isFacultyAdminRole ? "admin" : role}`
        ? pathname === item.href
        : pathname.startsWith(item.href),
    )?.title ?? "Dashboard";

  async function handleLogout() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="h-16 flex justify-center border-b">
            <div className="flex items-center gap-2 px-4">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                <IconTerminal2 size={20} />
              </div>
              <span className="tracking-tight text-base font-bold">SATPS</span>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-6">
            <div className="mb-8 px-2">
              <div className="flex items-center gap-2 h-10 px-3 rounded-2xl border text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <IconUserCircle size={16} />
                {ROLE_LABEL[role]}
              </div>
            </div>

            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-4">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {currentNav.map((item) => {
                    const isActive =
                      item.href === `/${role === "faculty_admin" ? "admin" : role}`
                        ? pathname === item.href
                        : pathname.startsWith(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={<Link href={item.href} />}
                          isActive={isActive}
                          className="px-4 py-6"
                        >
                          <item.icon />
                          <span className="font-bold text-xs uppercase tracking-widest">{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t p-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback>
                  {userName
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold truncate">{userName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
                title="Log out"
              >
                <IconLogout size={16} />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between px-8 border-b sticky top-0 z-10 bg-background/80 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <h1 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {ROLE_LABEL[role]} / <span className="text-foreground tracking-normal capitalize">{activeTitle}</span>
              </h1>
            </div>
            <div className="flex items-center gap-6">
              <Button variant="outline" size="icon" className="size-8 rounded-full">
                <IconBell size={16} />
              </Button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto px-8 py-10 bg-background">
            <div className="max-w-6xl mx-auto">{children}</div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
