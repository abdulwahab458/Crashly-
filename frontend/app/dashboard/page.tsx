"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useProject } from "@/context/ProjectContext";
import { apiRequest } from "@/utils/api";
import type { DashboardSummary, ErrorGroup } from "@/utils/types";
import { OverviewTrendsChart } from "@/components/OverviewTrendsChart";
import {
    AlertOctagon,
    Layers,
    Clock,
    Flame,
    ArrowUpRight,
    Plus,
    RotateCw,
    AlertCircle,
    ChevronRight,
    Terminal,
    CheckCircle2
} from "lucide-react";

export default function DashboardOverviewPage() {
    const { getToken, isLoaded: isAuthLoaded } = useAuth();
    const {
        projects,
        selectedProject,
        selectedProjectId,
        isLoading: isProjectLoading,
        setIsCreateModalOpen
    } = useProject();

    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [recentGroups, setRecentGroups] = useState<ErrorGroup[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDashboardData = useCallback(async () => {
        if (!selectedProjectId) {
            setIsLoadingData(false);
            return;
        }

        try {
            setIsLoadingData(true);
            setError(null);
            const token = await getToken();

            // Fetch summary and top/recent error groups in parallel
            const [summaryData, groupsData] = await Promise.all([
                apiRequest<DashboardSummary>(
                    `/dashboard/summary?projectId=${selectedProjectId}`,
                    token
                ),
                apiRequest<{ groups: ErrorGroup[] }>(
                    `/error-groups?projectId=${selectedProjectId}&limit=5`,
                    token
                )
            ]);

            setSummary(summaryData);
            setRecentGroups(groupsData.groups || []);
        } catch (err: any) {
            console.error("Failed to load dashboard metrics:", err);
            setError(err.message || "Failed to load dashboard metrics");
        } finally {
            setIsLoadingData(false);
        }
    }, [selectedProjectId, getToken]);

    useEffect(() => {
        if (selectedProjectId) {
            loadDashboardData();
        } else if (!isProjectLoading && projects.length === 0) {
            setIsLoadingData(false);
        }
    }, [selectedProjectId, isProjectLoading, projects.length, loadDashboardData]);

    if (!isAuthLoaded || isProjectLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 w-48 bg-zinc-800 rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="h-32 bg-zinc-900 border border-zinc-800 rounded-xl" />
                    <div className="h-32 bg-zinc-900 border border-zinc-800 rounded-xl" />
                    <div className="h-32 bg-zinc-900 border border-zinc-800 rounded-xl" />
                </div>
                <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-xl" />
            </div>
        );
    }

    // Empty state: No projects created yet
    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
                    <Layers className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-100 mb-2">Welcome to Crashly</h2>
                <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
                    Create your first project to start capturing, fingerprinting, and inspecting
                    real-time production errors.
                </p>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create Your First Project</span>
                </button>
            </div>
        );
    }

    const formatTimestamp = (isoString: string) => {
        try {
            const date = new Date(isoString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMinutes = Math.floor(diffMs / (60 * 1000));
            const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
            const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

            if (diffMinutes < 1) return "Just now";
            if (diffMinutes < 60) return `${diffMinutes}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;

            return date.toLocaleDateString([], { month: "short", day: "numeric" });
        } catch {
            return isoString;
        }
    };

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                        {selectedProject?.name || "Project Overview"}
                    </h1>
                    <p className="text-xs text-zinc-400 mt-1 font-mono">
                        Project ID: <span className="text-zinc-300">{selectedProjectId}</span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadDashboardData}
                        disabled={isLoadingData}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RotateCw className={`w-3.5 h-3.5 ${isLoadingData ? "animate-spin text-emerald-400" : ""}`} />
                        <span>Refresh Metrics</span>
                    </button>
                    <Link
                        href="/dashboard/issues"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-xs"
                    >
                        <span>View All Issues</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={loadDashboardData}
                        className="text-xs font-medium underline hover:no-underline ml-4"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Error Groups */}
                <div className="p-5 rounded-xl bg-zinc-900/70 border border-zinc-800 relative overflow-hidden group">
                    <div className="flex items-center justify-between text-zinc-400 text-xs font-medium uppercase tracking-wider mb-2">
                        <span>Total Error Groups</span>
                        <Layers className="w-4 h-4 text-emerald-400/70" />
                    </div>
                    <div className="text-3xl font-bold text-zinc-100 font-mono tracking-tight">
                        {isLoadingData ? (
                            <div className="h-8 w-20 bg-zinc-800 rounded animate-pulse" />
                        ) : (
                            summary?.totalErrorGroups.toLocaleString() ?? 0
                        )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">
                        Distinct fingerprinted error signatures recorded in this project
                    </p>
                </div>

                {/* Total Events */}
                <div className="p-5 rounded-xl bg-zinc-900/70 border border-zinc-800 relative overflow-hidden group">
                    <div className="flex items-center justify-between text-zinc-400 text-xs font-medium uppercase tracking-wider mb-2">
                        <span>Total Events</span>
                        <AlertOctagon className="w-4 h-4 text-cyan-400/70" />
                    </div>
                    <div className="text-3xl font-bold text-zinc-100 font-mono tracking-tight">
                        {isLoadingData ? (
                            <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
                        ) : (
                            summary?.totalEvents.toLocaleString() ?? 0
                        )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">
                        Cumulative individual crash occurrences ingested by the SDK
                    </p>
                </div>

                {/* Errors Last 24 Hours */}
                <div className="p-5 rounded-xl bg-zinc-900/70 border border-zinc-800 relative overflow-hidden group">
                    <div className="flex items-center justify-between text-zinc-400 text-xs font-medium uppercase tracking-wider mb-2">
                        <span>Last 24 Hours</span>
                        <Clock className="w-4 h-4 text-amber-400/70" />
                    </div>
                    <div className="text-3xl font-bold text-zinc-100 font-mono tracking-tight flex items-baseline gap-2">
                        {isLoadingData ? (
                            <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse" />
                        ) : (
                            <>
                                <span>{summary?.errorsLast24Hours.toLocaleString() ?? 0}</span>
                                {(summary?.errorsLast24Hours ?? 0) > 0 && (
                                    <span className="text-xs font-sans font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                                        Active
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">
                        Errors that occurred within the rolling 24-hour window
                    </p>
                </div>
            </div>

            {/* Trends Chart */}
            {selectedProjectId && (
                <OverviewTrendsChart projectId={selectedProjectId} />
            )}

            {/* Frequent / Recent Issues Section */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <h3 className="text-base font-semibold text-zinc-100">
                            Frequent Issues
                        </h3>
                    </div>
                    <Link
                        href="/dashboard/issues"
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
                    >
                        <span>View issues list</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                {isLoadingData ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-16 bg-zinc-950/40 border border-zinc-800/60 rounded-lg animate-pulse"
                            />
                        ))}
                    </div>
                ) : recentGroups.length === 0 ? (
                    <div className="p-8 text-center bg-zinc-950/40 rounded-lg border border-zinc-800/60">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-zinc-200">No issues detected yet</p>
                        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto mb-4">
                            Your project is clean. Install the Crashly SDK to monitor your application for uncaught exceptions.
                        </p>
                        <Link
                            href="/dashboard/api-keys"
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors"
                        >
                            <Terminal className="w-3.5 h-3.5" />
                            <span>Setup SDK & API Keys</span>
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800/60 overflow-hidden rounded-lg border border-zinc-800/60">
                        {recentGroups.map((group) => {
                            const isResolved = group.status === "RESOLVED";
                            return (
                                <Link
                                    key={group.id}
                                    href={`/dashboard/issues/${group.id}`}
                                    className="flex items-center justify-between p-4 bg-zinc-950/40 hover:bg-zinc-850/60 transition-colors group"
                                >
                                    <div className="min-w-0 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                                                    isResolved
                                                        ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                                                        : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                                }`}
                                            >
                                                {group.status}
                                            </span>
                                            <span className="font-semibold text-sm text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">
                                                {group.name}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-400 truncate max-w-2xl font-mono">
                                            {group.message}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-6 shrink-0 text-right">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-mono font-bold text-zinc-200">
                                                {group.occurrenceCount.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                                                events
                                            </span>
                                        </div>

                                        <div className="flex flex-col min-w-16">
                                            <span className="text-xs text-zinc-300 font-mono">
                                                {formatTimestamp(group.lastSeenAt)}
                                            </span>
                                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                                                last seen
                                            </span>
                                        </div>

                                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
