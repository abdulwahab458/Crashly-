"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignOutButton, useUser } from "@clerk/nextjs";
import { ProjectSelector } from "./ProjectSelector";
import {
    LayoutDashboard,
    AlertOctagon,
    Key,
    LogOut,
    Menu,
    X,
    ShieldAlert
} from "lucide-react";

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
    {
        label: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard
    },
    {
        label: "Issues",
        href: "/dashboard/issues",
        icon: AlertOctagon
    },
    {
        label: "API Keys",
        href: "/dashboard/api-keys",
        icon: Key
    }
];

export function Sidebar() {
    const pathname = usePathname();
    const { user } = useUser();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isCurrent = (href: string) => {
        if (href === "/dashboard") {
            return pathname === "/dashboard";
        }
        return pathname.startsWith(href);
    };

    const sidebarContent = (
        <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800/80 text-zinc-300">
            {/* Branding Header */}
            <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-2.5 group">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                        <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-base font-bold text-zinc-100 tracking-tight flex items-center gap-1.5">
                            Crashly
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </span>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">
                            Error Tracker
                        </span>
                    </div>
                </Link>

                <button
                    onClick={() => setMobileOpen(false)}
                    className="md:hidden text-zinc-400 hover:text-zinc-200 p-1"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Project Selector Section */}
            <div className="p-3 border-b border-zinc-800/50">
                <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider px-1 mb-1.5 font-mono">
                    Active Project
                </div>
                <ProjectSelector />
            </div>

            {/* Navigation links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider px-2 mb-2 font-mono">
                    Monitoring
                </div>
                {navItems.map((item) => {
                    const active = isCurrent(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                active
                                    ? "bg-zinc-850 text-emerald-400 border border-zinc-800 font-semibold shadow-xs"
                                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                            }`}
                        >
                            <Icon
                                className={`w-4 h-4 transition-colors ${
                                    active ? "text-emerald-400" : "text-zinc-400"
                                }`}
                            />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile & Sign Out Footer */}
            <div className="p-3 border-t border-zinc-800/60 bg-zinc-950/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <UserButton
                        appearance={{
                            elements: {
                                avatarBox: "w-8 h-8 rounded-lg border border-zinc-800"
                            }
                        }}
                    />
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-zinc-200 truncate">
                            {user?.fullName || user?.primaryEmailAddress?.emailAddress || "Developer"}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate">
                            {user?.primaryEmailAddress?.emailAddress || ""}
                        </span>
                    </div>
                </div>

                <SignOutButton>
                    <button
                        title="Sign Out"
                        className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </SignOutButton>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Header Bar */}
            <div className="md:hidden flex items-center justify-between p-3 bg-zinc-950 border-b border-zinc-800 sticky top-0 z-30">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <ShieldAlert className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-zinc-100 text-sm">Crashly</span>
                </div>
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg bg-zinc-900 border border-zinc-800"
                    aria-label="Open menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </div>

            {/* Mobile Backdrop & Drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    <div
                        className="fixed inset-0 bg-black/70 backdrop-blur-xs"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="relative w-72 max-w-[85vw] h-full z-50">
                        {sidebarContent}
                    </div>
                </div>
            )}

            {/* Desktop Persistent Sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
                {sidebarContent}
            </aside>
        </>
    );
}
