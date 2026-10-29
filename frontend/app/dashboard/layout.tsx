import React, { Suspense } from "react";
import { ProjectProvider } from "@/context/ProjectContext";
import { Sidebar } from "@/components/Sidebar";
import { CreateProjectModal } from "@/components/CreateProjectModal";

export default function DashboardLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <ProjectProvider>
            <div className="min-h-screen bg-black text-zinc-100 flex flex-col md:flex-row antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
                <Suspense fallback={<div className="hidden md:flex w-64 bg-zinc-950 border-r border-zinc-800" />}>
                    <Sidebar />
                </Suspense>
                <main className="flex-1 md:pl-64 min-w-0 flex flex-col">
                    <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
                        <Suspense fallback={<div className="h-64 animate-pulse bg-zinc-900 rounded-xl" />}>
                            {children}
                        </Suspense>
                    </div>
                </main>
                <CreateProjectModal />
            </div>
        </ProjectProvider>
    );
}
