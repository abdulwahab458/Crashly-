"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useProject } from "@/context/ProjectContext";
import { apiRequest } from "@/utils/api";
import type {
    ErrorGroup,
    ErrorEvent,
    ErrorGroupDetailResponse,
    ErrorGroupStatus
} from "@/utils/types";
import {
    ArrowLeft,
    Check,
    RotateCw,
    Trash2,
    Clock,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Loader2
} from "lucide-react";

export default function ErrorGroupDetailPage() {
    return (
        <Suspense fallback={<div className="h-96 w-full animate-pulse bg-zinc-900 rounded-xl" />}>
            <ErrorGroupDetailContent />
        </Suspense>
    );
}

function ErrorGroupDetailContent() {
    const params = useParams();
    const router = useRouter();
    const groupId = params.groupId as string;

    const { getToken } = useAuth();
    const { selectedProjectId } = useProject();

    // Data states
    const [group, setGroup] = useState<ErrorGroup | null>(null);
    const [events, setEvents] = useState<ErrorEvent[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });
    const [page, setPage] = useState(1);
    const limit = 10;

    // Loading & error states
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Mutation states
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [statusSuccessMessage, setStatusSuccessMessage] = useState<string | null>(null);

    // Deletion states
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Stack trace expansion state per event ID
    const [expandedStacks, setExpandedStacks] = useState<Record<string, boolean>>({});

    const toggleStack = (eventId: string) => {
        setExpandedStacks((prev) => ({
            ...prev,
            [eventId]: !prev[eventId]
        }));
    };

    const fetchGroupDetail = useCallback(async () => {
        if (!groupId) return;

        try {
            setIsLoading(true);
            setError(null);
            const token = await getToken();
            const projectQuery = selectedProjectId ? `&projectId=${selectedProjectId}` : "";
            const data = await apiRequest<ErrorGroupDetailResponse>(
                `/error-groups/${groupId}?page=${page}&limit=${limit}${projectQuery}`,
                token
            );

            setGroup(data.group);
            setEvents(data.events || []);
            setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });

            // Automatically expand the latest event's stack trace
            if (data.events && data.events.length > 0 && page === 1) {
                setExpandedStacks((prev) => ({
                    ...prev,
                    [data.events[0].id]: true
                }));
            }
        } catch (err: any) {
            console.error("Failed to load error group:", err);
            setError(err.message || "Failed to load error details");
        } finally {
            setIsLoading(false);
        }
    }, [groupId, page, limit, selectedProjectId, getToken]);

    useEffect(() => {
        fetchGroupDetail();
    }, [fetchGroupDetail]);

    // Status action (Resolve / Reopen)
    const handleToggleStatus = async () => {
        if (!group || isUpdatingStatus) return;

        const nextStatus: ErrorGroupStatus =
            group.status === "RESOLVED" ? "UNRESOLVED" : "RESOLVED";

        try {
            setIsUpdatingStatus(true);
            setStatusSuccessMessage(null);
            const token = await getToken();
            const projectQuery = selectedProjectId ? `?projectId=${selectedProjectId}` : "";
            const response = await apiRequest<{ group: { id: string; status: ErrorGroupStatus; updatedAt: string } }>(
                `/error-groups/${group.id}/status${projectQuery}`,
                token,
                {
                    method: "PATCH",
                    body: JSON.stringify({ status: nextStatus })
                }
            );

            setGroup((prev) => (prev ? { ...prev, status: response.group.status, updatedAt: response.group.updatedAt } : null));
            setStatusSuccessMessage(
                nextStatus === "RESOLVED"
                    ? "Issue marked as resolved."
                    : "Issue reopened."
            );

            setTimeout(() => setStatusSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error("Failed to update status:", err);
            alert(`Failed to update status: ${err.message || "Unknown error"}`);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // Delete Error Group
    const handleDeleteGroup = async () => {
        if (!group || isDeleting) return;

        try {
            setIsDeleting(true);
            setDeleteError(null);
            const token = await getToken();
            const projectQuery = selectedProjectId ? `?projectId=${selectedProjectId}` : "";
            await apiRequest<{ message: string }>(
                `/error-groups/${group.id}${projectQuery}`,
                token,
                {
                    method: "DELETE"
                }
            );

            setIsDeleteDialogOpen(false);
            router.push("/dashboard/issues");
        } catch (err: any) {
            console.error("Failed to delete error group:", err);
            setDeleteError(err.message || "Failed to delete error group");
            setIsDeleting(false);
        }
    };

    const formatDate = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short"
            });
        } catch {
            return isoString;
        }
    };

    if (isLoading && !group) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-6 w-32 bg-zinc-800 rounded" />
                <div className="h-32 bg-zinc-900 border border-zinc-800 rounded-xl" />
                <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-xl" />
            </div>
        );
    }

    if (error || !group) {
        return (
            <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl max-w-lg mx-auto">
                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-zinc-100">Error Group Not Found</h2>
                <p className="text-xs text-zinc-400 mt-1 mb-6">
                    {error || "The requested error group could not be found or you don't have access to it."}
                </p>
                <Link
                    href="/dashboard/issues"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Issues</span>
                </Link>
            </div>
        );
    }

    const isResolved = group.status === "RESOLVED";

    return (
        <div className="space-y-6">
            {/* Back link & Top bar */}
            <div className="flex items-center justify-between">
                <Link
                    href="/dashboard/issues"
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 font-medium transition-colors group"
                >
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back to Issues</span>
                </Link>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchGroupDetail}
                        disabled={isLoading}
                        title="Refresh details"
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
                    </button>

                    <button
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-600 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Issue</span>
                    </button>
                </div>
            </div>

            {statusSuccessMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>{statusSuccessMessage}</span>
                </div>
            )}

            {/* Header / Summary Card */}
            <div className="p-6 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span
                                className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                                    isResolved
                                        ? "bg-zinc-800 text-emerald-400 border-zinc-700"
                                        : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                }`}
                            >
                                {group.status}
                            </span>
                            <h1 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight">
                                {group.name}
                            </h1>
                        </div>
                        <p className="text-sm text-zinc-300 font-mono break-words bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80 mt-2">
                            {group.message}
                        </p>
                    </div>

                    <div className="shrink-0">
                        <button
                            onClick={handleToggleStatus}
                            disabled={isUpdatingStatus}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                                isResolved
                                    ? "bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            }`}
                        >
                            {isUpdatingStatus ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Updating...</span>
                                </>
                            ) : isResolved ? (
                                <>
                                    <RotateCw className="w-3.5 h-3.5" />
                                    <span>Reopen Issue</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Mark as Resolved</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Metadata details row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-800/60 text-xs">
                    <div>
                        <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-mono block mb-1">
                            Occurrences
                        </span>
                        <span className="font-mono font-bold text-base text-zinc-100">
                            {group.occurrenceCount.toLocaleString()}
                        </span>
                    </div>

                    <div>
                        <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-mono block mb-1">
                            First Seen
                        </span>
                        <span className="font-mono text-zinc-300">
                            {formatDate(group.firstSeenAt)}
                        </span>
                    </div>

                    <div>
                        <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-mono block mb-1">
                            Last Seen
                        </span>
                        <span className="font-mono text-zinc-300">
                            {formatDate(group.lastSeenAt)}
                        </span>
                    </div>

                    <div>
                        <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-mono block mb-1">
                            Fingerprint
                        </span>
                        <span
                            className="font-mono text-zinc-400 truncate block"
                            title={group.fingerprint}
                        >
                            {group.fingerprint.slice(0, 16)}...
                        </span>
                    </div>
                </div>
            </div>

            {/* Event History Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                        <span>Event History</span>
                        <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                            {pagination.total.toLocaleString()}
                        </span>
                    </h2>

                    {pagination.totalPages > 1 && (
                        <div className="flex items-center gap-2 text-xs">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={pagination.page <= 1 || isLoading}
                                className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-40"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="font-mono text-zinc-400">
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                disabled={pagination.page >= pagination.totalPages || isLoading}
                                className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-40"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {events.length === 0 ? (
                    <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800 rounded-xl text-zinc-400 text-xs">
                        No events recorded for this group.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {events.map((event, idx) => {
                            const isExpanded = !!expandedStacks[event.id];

                            return (
                                <div
                                    key={event.id}
                                    className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center gap-2 font-mono">
                                            <span className="text-zinc-500 font-bold">#{pagination.total - ((pagination.page - 1) * pagination.limit + idx)}</span>
                                            <span className="font-semibold text-zinc-200">{event.name}</span>
                                            <span className="text-zinc-400 truncate max-w-md">— {event.message}</span>
                                        </div>

                                        <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
                                            <Clock className="w-3 h-3 text-zinc-500" />
                                            <span>{formatDate(event.timestamp)}</span>
                                        </div>
                                    </div>

                                    {/* Stack Trace Accordion */}
                                    {event.stack ? (
                                        <div className="border border-zinc-800/80 rounded-lg overflow-hidden bg-zinc-950/80">
                                            <button
                                                onClick={() => toggleStack(event.id)}
                                                className="w-full px-3 py-2 flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-colors"
                                            >
                                                <span className="font-mono text-[11px] font-medium">Stack Trace</span>
                                                <span className="flex items-center gap-1 text-[11px]">
                                                    {isExpanded ? (
                                                        <>
                                                            <span>Collapse</span>
                                                            <ChevronUp className="w-3.5 h-3.5" />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>Expand</span>
                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                        </>
                                                    )}
                                                </span>
                                            </button>

                                            {isExpanded && (
                                                <pre className="p-3.5 text-xs font-mono text-zinc-300 bg-black/60 border-t border-zinc-800/80 overflow-x-auto whitespace-pre leading-relaxed select-text">
                                                    {event.stack}
                                                </pre>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-[11px] text-zinc-500 font-mono italic px-2">
                                            (No stack trace provided for this event)
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Permanent Deletion Confirmation Modal */}
            {isDeleteDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div
                        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 text-zinc-100 space-y-4"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-zinc-100">
                                    Permanently Delete Error Group?
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
                            Deleting this error group will permanently remove it along with all{" "}
                            <span className="font-mono font-bold text-zinc-100">
                                {group.occurrenceCount}
                            </span>{" "}
                            associated event records from the database.
                        </p>

                        {deleteError && (
                            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                                {deleteError}
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsDeleteDialogOpen(false)}
                                disabled={isDeleting}
                                className="px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteGroup}
                                disabled={isDeleting}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <span>Confirm Delete</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
