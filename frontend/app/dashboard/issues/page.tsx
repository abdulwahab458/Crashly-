"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useProject } from "@/context/ProjectContext";
import { apiRequest } from "@/utils/api";
import type { ErrorGroup, ErrorGroupsResponse, ErrorGroupStatus } from "@/utils/types";
import {
    Search,
    X,
    ChevronLeft,
    ChevronRight,
    RotateCw,
    AlertOctagon,
    CheckCircle2,
    Terminal
} from "lucide-react";

export default function IssuesListPage() {
    return (
        <Suspense fallback={<div className="h-96 w-full animate-pulse bg-zinc-900 rounded-xl" />}>
            <IssuesListContent />
        </Suspense>
    );
}

function IssuesListContent() {
    const { getToken } = useAuth();
    const { selectedProjectId, selectedProject, isLoading: isProjectLoading } = useProject();

    // Query states
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [page, setPage] = useState(1);
    const limit = 20;

    // Data states
    const [groups, setGroups] = useState<ErrorGroup[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Status action in-flight state
    const [updatingGroupId, setUpdatingGroupId] = useState<string | null>(null);

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1); // Reset page on new search
        }, 350);
        return () => clearTimeout(handler);
    }, [search]);

    const fetchIssues = useCallback(async () => {
        if (!selectedProjectId) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const token = await getToken();

            const params = new URLSearchParams();
            params.set("projectId", selectedProjectId);
            params.set("page", String(page));
            params.set("limit", String(limit));

            if (debouncedSearch) {
                params.set("search", debouncedSearch);
            }

            if (statusFilter === "UNRESOLVED" || statusFilter === "RESOLVED") {
                params.set("status", statusFilter);
            }

            const data = await apiRequest<ErrorGroupsResponse>(
                `/error-groups?${params.toString()}`,
                token
            );

            setGroups(data.groups || []);
            setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
        } catch (err: any) {
            console.error("Failed to fetch error groups:", err);
            setError(err.message || "Failed to load error groups");
        } finally {
            setIsLoading(false);
        }
    }, [selectedProjectId, page, limit, debouncedSearch, statusFilter, getToken]);

    useEffect(() => {
        if (selectedProjectId) {
            fetchIssues();
        }
    }, [selectedProjectId, fetchIssues]);

    // Handle Quick Status Update (Resolve / Reopen)
    const handleToggleStatus = async (
        e: React.MouseEvent,
        group: ErrorGroup
    ) => {
        e.preventDefault();
        e.stopPropagation();

        if (updatingGroupId) return;

        const nextStatus: ErrorGroupStatus =
            group.status === "RESOLVED" ? "UNRESOLVED" : "RESOLVED";

        try {
            setUpdatingGroupId(group.id);
            const token = await getToken();
            await apiRequest<{ group: { id: string; status: ErrorGroupStatus } }>(
                `/error-groups/${group.id}/status?projectId=${selectedProjectId}`,
                token,
                {
                    method: "PATCH",
                    body: JSON.stringify({ status: nextStatus })
                }
            );

            // Update in-memory state
            setGroups((prev) =>
                prev.map((g) =>
                    g.id === group.id ? { ...g, status: nextStatus } : g
                )
            );
        } catch (err: any) {
            console.error("Failed to update error status:", err);
            alert(`Failed to update status: ${err.message || "Unknown error"}`);
        } finally {
            setUpdatingGroupId(null);
        }
    };

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

            return date.toLocaleDateString([], {
                month: "short",
                day: "numeric",
                year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
            });
        } catch {
            return isoString;
        }
    };

    if (!selectedProjectId && !isProjectLoading) {
        return (
            <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                <AlertOctagon className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-zinc-200">No Project Selected</h2>
                <p className="text-xs text-zinc-500 mt-1">Please select or create a project to inspect issues.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
                        Issues
                        <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                            {pagination.total.toLocaleString()}
                        </span>
                    </h1>
                    <p className="text-xs text-zinc-400 mt-1">
                        Fingerprinted error groups for{" "}
                        <span className="text-zinc-200 font-medium">{selectedProject?.name}</span>
                    </p>
                </div>

                <button
                    onClick={fetchIssues}
                    disabled={isLoading}
                    className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                >
                    <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
                    <span>Refresh</span>
                </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                {/* Search input */}
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search issues by name or message..."
                        className="w-full pl-9 pr-9 py-2 bg-zinc-900 border border-zinc-800 focus:border-emerald-500/80 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-0.5"
                            aria-label="Clear search"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Status tabs */}
                <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 shrink-0">
                    <button
                        onClick={() => {
                            setStatusFilter("ALL");
                            setPage(1);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            statusFilter === "ALL"
                                ? "bg-zinc-800 text-zinc-100 font-semibold shadow-xs"
                                : "text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => {
                            setStatusFilter("UNRESOLVED");
                            setPage(1);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                            statusFilter === "UNRESOLVED"
                                ? "bg-zinc-800 text-rose-400 font-semibold shadow-xs"
                                : "text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span>Unresolved</span>
                    </button>
                    <button
                        onClick={() => {
                            setStatusFilter("RESOLVED");
                            setPage(1);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                            statusFilter === "RESOLVED"
                                ? "bg-zinc-800 text-emerald-400 font-semibold shadow-xs"
                                : "text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Resolved</span>
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={fetchIssues} className="underline text-xs ml-4">
                        Retry
                    </button>
                </div>
            )}

            {/* Table Area */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-xs">
                {isLoading ? (
                    <div className="divide-y divide-zinc-850">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 w-48 bg-zinc-800 rounded" />
                                    <div className="h-3 w-80 bg-zinc-850 rounded" />
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="h-4 w-12 bg-zinc-800 rounded" />
                                    <div className="h-4 w-20 bg-zinc-800 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : groups.length === 0 ? (
                    <div className="p-12 text-center">
                        {debouncedSearch || statusFilter !== "ALL" ? (
                            <div>
                                <AlertOctagon className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                                <h3 className="text-base font-semibold text-zinc-200">No matching issues</h3>
                                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                                    No error groups matched your search term or status filter.
                                </p>
                                <button
                                    onClick={() => {
                                        setSearch("");
                                        setStatusFilter("ALL");
                                    }}
                                    className="mt-4 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-lg transition-colors border border-zinc-700"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        ) : (
                            <div>
                                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                                <h3 className="text-base font-semibold text-zinc-100">Zero errors reported</h3>
                                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto mb-6">
                                    This project hasn&apos;t captured any crashes yet. Configure the Crashly SDK to begin receiving errors.
                                </p>
                                <Link
                                    href="/dashboard/api-keys"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
                                >
                                    <Terminal className="w-3.5 h-3.5" />
                                    <span>Get Project API Key</span>
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-950/60 border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                                <tr>
                                    <th className="py-3 px-4">Issue</th>
                                    <th className="py-3 px-4 w-28 text-center">Status</th>
                                    <th className="py-3 px-4 w-24 text-right">Events</th>
                                    <th className="py-3 px-4 w-32 text-right">Last Seen</th>
                                    <th className="py-3 px-4 w-28 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-850 text-zinc-300">
                                {groups.map((group) => {
                                    const isResolved = group.status === "RESOLVED";
                                    const isUpdating = updatingGroupId === group.id;

                                    return (
                                        <tr
                                            key={group.id}
                                            className="hover:bg-zinc-850/50 transition-colors group cursor-pointer"
                                        >
                                            <td className="py-3.5 px-4 max-w-md">
                                                <Link
                                                    href={`/dashboard/issues/${group.id}`}
                                                    className="block"
                                                >
                                                    <div className="font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
                                                        {group.name}
                                                    </div>
                                                    <div
                                                        className="text-xs text-zinc-400 font-mono truncate mt-0.5 max-w-xl"
                                                        title={group.message}
                                                    >
                                                        {group.message}
                                                    </div>
                                                </Link>
                                            </td>

                                            <td className="py-3.5 px-4 text-center">
                                                <span
                                                    className={`inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                                                        isResolved
                                                            ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                                                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                                    }`}
                                                >
                                                    {group.status}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4 text-right font-mono font-medium text-zinc-200">
                                                {group.occurrenceCount.toLocaleString()}
                                            </td>

                                            <td className="py-3.5 px-4 text-right font-mono text-xs text-zinc-400">
                                                {formatTimestamp(group.lastSeenAt)}
                                            </td>

                                            <td className="py-3.5 px-4 text-right">
                                                <button
                                                    onClick={(e) => handleToggleStatus(e, group)}
                                                    disabled={isUpdating}
                                                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                                                        isResolved
                                                            ? "bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700"
                                                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                    }`}
                                                >
                                                    {isUpdating
                                                        ? "Updating..."
                                                        : isResolved
                                                        ? "Reopen"
                                                        : "Resolve"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                    <div className="p-3 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-between text-xs text-zinc-400">
                        <div>
                            Showing{" "}
                            <span className="font-mono text-zinc-200 font-medium">
                                {(pagination.page - 1) * pagination.limit + 1}
                            </span>{" "}
                            to{" "}
                            <span className="font-mono text-zinc-200 font-medium">
                                {Math.min(pagination.page * pagination.limit, pagination.total)}
                            </span>{" "}
                            of{" "}
                            <span className="font-mono text-zinc-200 font-medium">
                                {pagination.total.toLocaleString()}
                            </span>{" "}
                            issues
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={pagination.page <= 1 || isLoading}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                <span>Previous</span>
                            </button>

                            <span className="px-2 font-mono text-zinc-300">
                                {pagination.page} / {pagination.totalPages}
                            </span>

                            <button
                                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                disabled={pagination.page >= pagination.totalPages || isLoading}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                            >
                                <span>Next</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
