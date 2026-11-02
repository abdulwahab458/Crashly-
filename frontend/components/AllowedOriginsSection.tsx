"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Globe2, Loader2, Plus, Trash2, X } from "lucide-react";
import { apiRequest } from "@/utils/api";
import type { AllowedOrigin } from "@/utils/types";

interface AllowedOriginsSectionProps {
    projectId: string;
}

export function AllowedOriginsSection({ projectId }: AllowedOriginsSectionProps) {
    const { getToken } = useAuth();
    const [origins, setOrigins] = useState<AllowedOrigin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [origin, setOrigin] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const loadOrigins = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const token = await getToken();
            const data = await apiRequest<{ origins: AllowedOrigin[] }>(
                `/dashboard/projects/${projectId}/origins`,
                token
            );
            setOrigins(data.origins || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load allowed origins");
        } finally {
            setIsLoading(false);
        }
    }, [getToken, projectId]);

    useEffect(() => {
        void loadOrigins();
    }, [loadOrigins]);

    const showToast = (message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(null), 3000);
    };

    const closeModal = () => {
        if (!isSubmitting) {
            setIsModalOpen(false);
            setOrigin("");
        }
    };

    const handleAddOrigin = async (event: React.FormEvent) => {
        event.preventDefault();
        const trimmedOrigin = origin.trim();
        if (!trimmedOrigin) {
            setError("Origin is required");
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            const token = await getToken();
            await apiRequest(
                `/dashboard/projects/${projectId}/origins`,
                token,
                {
                    method: "POST",
                    body: JSON.stringify({ origin: trimmedOrigin })
                }
            );
            setIsModalOpen(false);
            setOrigin("");
            await loadOrigins();
            showToast("Origin added successfully");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add origin");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteOrigin = async (originToDelete: AllowedOrigin) => {
        if (!window.confirm(`Remove ${originToDelete.origin} from this project?`)) {
            return;
        }

        try {
            setDeletingId(originToDelete.id);
            setError(null);
            const token = await getToken();
            await apiRequest(
                `/dashboard/projects/${projectId}/origins/${originToDelete.id}`,
                token,
                { method: "DELETE" }
            );
            await loadOrigins();
            showToast("Origin removed successfully");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to remove origin");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <>
            <section className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <Globe2 className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-zinc-100">Allowed Origins</h2>
                            <p className="text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">
                                Domains allowed to send browser error events to this project through the Crashly Browser SDK.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setError(null);
                            setIsModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-semibold text-black bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-sm shadow-emerald-950 shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        Add Origin
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="space-y-2" aria-label="Loading allowed origins">
                        <div className="h-12 bg-zinc-950/50 rounded-lg animate-pulse" />
                        <div className="h-12 bg-zinc-950/50 rounded-lg animate-pulse" />
                    </div>
                ) : origins.length === 0 ? (
                    <div className="p-6 text-center bg-zinc-950/40 rounded-lg border border-zinc-800/60">
                        <Globe2 className="w-7 h-7 text-zinc-600 mx-auto mb-2" />
                        <p className="text-sm font-medium text-zinc-200">No origins registered</p>
                        <p className="text-xs text-zinc-500 mt-1 mb-4">
                            Add your frontend domain to start accepting browser events.
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add your first origin
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800/60 rounded-lg border border-zinc-800/60 overflow-hidden">
                        {origins.map((allowedOrigin) => (
                            <div
                                key={allowedOrigin.id}
                                className="flex items-center justify-between gap-4 px-4 py-3 bg-zinc-950/40"
                            >
                                <span className="text-sm text-zinc-200 font-mono break-all">
                                    {allowedOrigin.origin}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => void handleDeleteOrigin(allowedOrigin)}
                                    disabled={deletingId !== null}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-colors disabled:opacity-50 shrink-0"
                                    aria-label={`Remove ${allowedOrigin.origin}`}
                                >
                                    {deletingId === allowedOrigin.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {toast && (
                <div
                    role="status"
                    className="fixed top-5 right-5 z-50 px-4 py-3 rounded-lg bg-emerald-500 text-black text-sm font-semibold shadow-xl"
                >
                    {toast}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
                    <div
                        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 text-zinc-100"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-origin-title"
                    >
                        <button
                            type="button"
                            onClick={closeModal}
                            disabled={isSubmitting}
                            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 disabled:opacity-50"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2 id="add-origin-title" className="text-lg font-semibold">Add Allowed Origin</h2>
                        <p className="text-xs text-zinc-400 mt-1 mb-5">
                            Enter a domain such as <code className="text-zinc-300">https://myapp.com</code>.
                        </p>
                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleAddOrigin} className="space-y-4">
                            <div>
                                <label htmlFor="allowed-origin" className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Origin
                                </label>
                                <input
                                    id="allowed-origin"
                                    type="url"
                                    value={origin}
                                    onChange={(event) => setOrigin(event.target.value)}
                                    placeholder="https://myapp.com"
                                    autoFocus
                                    disabled={isSubmitting}
                                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !origin.trim()}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:pointer-events-none rounded-lg"
                                >
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isSubmitting ? "Adding..." : "Add Origin"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
