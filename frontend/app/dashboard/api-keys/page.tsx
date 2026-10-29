"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useProject } from "@/context/ProjectContext";
import { apiRequest } from "@/utils/api";
import type { ApiKey, CreateApiKeyResponse } from "@/utils/types";
import {
    Key,
    Plus,
    RotateCw,
    Copy,
    Check,
    AlertTriangle,
    ShieldAlert,
    Code2,
    Loader2,
    X
} from "lucide-react";

export default function ApiKeysPage() {
    return (
        <Suspense fallback={<div className="h-96 w-full animate-pulse bg-zinc-900 rounded-xl" />}>
            <ApiKeysContent />
        </Suspense>
    );
}

function ApiKeysContent() {
    const { getToken } = useAuth();
    const { selectedProjectId, selectedProject, isLoading: isProjectLoading } = useProject();

    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // One-time newly created key display modal
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
    const [isCreatingKey, setIsCreatingKey] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);

    // Revocation modal state
    const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
    const [isRevoking, setIsRevoking] = useState(false);
    const [revokeError, setRevokeError] = useState<string | null>(null);

    // Code snippet copy state
    const [copiedSnippet, setCopiedSnippet] = useState(false);

    const fetchKeys = useCallback(async () => {
        if (!selectedProjectId) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const token = await getToken();
            const data = await apiRequest<{ apiKeys: ApiKey[] }>(
                `/dashboard/projects/${selectedProjectId}/api-keys`,
                token
            );
            setKeys(data.apiKeys || []);
        } catch (err: any) {
            console.error("Failed to fetch API keys:", err);
            setError(err.message || "Failed to load API keys");
        } finally {
            setIsLoading(false);
        }
    }, [selectedProjectId, getToken]);

    useEffect(() => {
        if (selectedProjectId) {
            fetchKeys();
        }
    }, [selectedProjectId, fetchKeys]);

    // Create New Key
    const handleCreateKey = async () => {
        if (!selectedProjectId || isCreatingKey) return;

        try {
            setIsCreatingKey(true);
            setError(null);
            const token = await getToken();
            const data = await apiRequest<CreateApiKeyResponse>(
                `/dashboard/projects/${selectedProjectId}/api-keys`,
                token,
                {
                    method: "POST",
                    body: JSON.stringify({})
                }
            );

            // Set raw secret for one-time display (never stored in localStorage)
            setNewlyCreatedKey(data.apiKey);
            setCopiedKey(false);

            // Refresh key listing
            await fetchKeys();
        } catch (err: any) {
            console.error("Failed to create API key:", err);
            setError(err.message || "Failed to create API key");
        } finally {
            setIsCreatingKey(false);
        }
    };

    // Confirm Revocation
    const handleRevokeKey = async () => {
        if (!selectedProjectId || !keyToRevoke || isRevoking) return;

        try {
            setIsRevoking(true);
            setRevokeError(null);
            const token = await getToken();
            await apiRequest<{ message: string; key: { id: string; revokedAt: string } }>(
                `/dashboard/projects/${selectedProjectId}/api-keys/${keyToRevoke.id}`,
                token,
                {
                    method: "DELETE"
                }
            );

            // Update in-memory state immediately
            setKeys((prev) =>
                prev.map((k) =>
                    k.id === keyToRevoke.id
                        ? { ...k, revokedAt: new Date().toISOString() }
                        : k
                )
            );
            setKeyToRevoke(null);
        } catch (err: any) {
            console.error("Failed to revoke key:", err);
            setRevokeError(err.message || "Failed to revoke API key");
        } finally {
            setIsRevoking(false);
        }
    };

    const copyToClipboard = (text: string, isSnippet = false) => {
        navigator.clipboard.writeText(text);
        if (isSnippet) {
            setCopiedSnippet(true);
            setTimeout(() => setCopiedSnippet(false), 2000);
        } else {
            setCopiedKey(true);
            setTimeout(() => setCopiedKey(false), 2000);
        }
    };

    const formatDate = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
        } catch {
            return isoString;
        }
    };

    const sampleKey = newlyCreatedKey || (keys.find((k) => !k.revokedAt)?.keyPrefix ? `${keys.find((k) => !k.revokedAt)?.keyPrefix}_...` : "etrk_live_your_key_here");
    const endpointUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/events`;

    const sdkSnippet = `import { ErrorTracker } from "crashly-sdk";

const tracker = new ErrorTracker({
    apiKey: "${sampleKey}",
    endpoint: "${endpointUrl}"
});

// Automatically capture unhandled exceptions:
tracker.init();

// Or manually report handled errors:
try {
    // Application logic
} catch (error) {
    tracker.captureException(error);
}`;

    if (!selectedProjectId && !isProjectLoading) {
        return (
            <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                <Key className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-zinc-200">No Project Selected</h2>
                <p className="text-xs text-zinc-500 mt-1">Please select or create a project to manage API keys.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2.5">
                        API Keys
                        <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                            {keys.length}
                        </span>
                    </h1>
                    <p className="text-xs text-zinc-400 mt-1">
                        Manage ingest authentication tokens for{" "}
                        <span className="text-zinc-200 font-medium">{selectedProject?.name}</span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchKeys}
                        disabled={isLoading}
                        title="Refresh keys"
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
                        <span>Refresh</span>
                    </button>

                    <button
                        onClick={handleCreateKey}
                        disabled={isCreatingKey}
                        className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                    >
                        {isCreatingKey ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Create API Key</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={fetchKeys} className="underline text-xs ml-4">
                        Retry
                    </button>
                </div>
            )}

            {/* API Keys Table */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-xs">
                {isLoading ? (
                    <div className="divide-y divide-zinc-850 p-4 space-y-3">
                        {[1, 2].map((i) => (
                            <div key={i} className="h-12 bg-zinc-950/40 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : keys.length === 0 ? (
                    <div className="p-12 text-center">
                        <Key className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-zinc-100">No API keys yet</h3>
                        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto mb-6">
                            Generate an API key to allow your application or Crashly SDK to authenticate error events.
                        </p>
                        <button
                            onClick={handleCreateKey}
                            disabled={isCreatingKey}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create Your First API Key</span>
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-950/60 border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                                <tr>
                                    <th className="py-3 px-4">Key Prefix</th>
                                    <th className="py-3 px-4 w-32 text-center">Status</th>
                                    <th className="py-3 px-4 w-36 text-right">Created</th>
                                    <th className="py-3 px-4 w-28 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-850 text-zinc-300">
                                {keys.map((k) => {
                                    const isRevoked = Boolean(k.revokedAt);

                                    return (
                                        <tr key={k.id} className="hover:bg-zinc-850/40 transition-colors">
                                            <td className="py-3.5 px-4 font-mono text-xs">
                                                <div className="flex items-center gap-2">
                                                    <Key className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                                    <span className="text-zinc-200 font-semibold">{k.keyPrefix}</span>
                                                    <span className="text-zinc-600">••••••••</span>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 text-center">
                                                {isRevoked ? (
                                                    <span className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                                                        REVOKED
                                                    </span>
                                                ) : (
                                                    <span className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                                        ACTIVE
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 text-right font-mono text-xs text-zinc-400">
                                                {formatDate(k.createdAt)}
                                            </td>

                                            <td className="py-3.5 px-4 text-right">
                                                {isRevoked ? (
                                                    <span className="text-xs text-zinc-600 font-medium italic">
                                                        Revoked
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => setKeyToRevoke(k)}
                                                        className="px-2.5 py-1 text-xs font-medium text-rose-400 hover:text-white hover:bg-rose-600/80 bg-rose-500/10 border border-rose-500/20 rounded-md transition-colors"
                                                    >
                                                        Revoke
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* SDK Setup Guide Panel */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Code2 className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-zinc-100">
                            Configure Crashly SDK
                        </h2>
                        <p className="text-xs text-zinc-400">
                            Initialize the error tracking SDK in your Node.js or TypeScript backend
                        </p>
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <div className="text-xs text-zinc-300 font-medium">
                        1. Install the SDK package:
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-emerald-400 flex items-center justify-between">
                        <code>npm install crashly-sdk</code>
                        <button
                            onClick={() => copyToClipboard("npm install crashly-sdk")}
                            className="text-zinc-400 hover:text-zinc-200 p-1"
                            title="Copy command"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="text-xs text-zinc-300 font-medium pt-2">
                        2. Initialize the tracker at application startup:
                    </div>
                    <div className="relative bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                        <button
                            onClick={() => copyToClipboard(sdkSnippet, true)}
                            className="absolute right-3 top-3 flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 rounded-md transition-colors z-10"
                        >
                            {copiedSnippet ? (
                                <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Code</span>
                                </>
                            )}
                        </button>
                        <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed select-text">
                            {sdkSnippet}
                        </pre>
                    </div>
                </div>
            </div>

            {/* One-Time Key Display Modal */}
            {newlyCreatedKey && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div
                        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 text-zinc-100 space-y-4"
                        role="dialog"
                        aria-modal="true"
                    >
                        <button
                            onClick={() => setNewlyCreatedKey(null)}
                            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <Key className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-zinc-100">
                                    API Key Generated
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    Copy your secret key now. It will never be shown again.
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-xs flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                                Please store this key securely. For security reasons, we do not store raw keys and you will not be able to retrieve it after closing this modal.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider">
                                Secret API Key
                            </label>
                            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5">
                                <code className="flex-1 font-mono text-xs text-emerald-400 break-all select-all">
                                    {newlyCreatedKey}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(newlyCreatedKey)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors shrink-0 shadow-xs"
                                >
                                    {copiedKey ? (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Copy Key</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setNewlyCreatedKey(null)}
                                className="px-4 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors border border-zinc-700"
                            >
                                Done & Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Revoke Confirmation Modal */}
            {keyToRevoke && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                    <div
                        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 text-zinc-100 space-y-4"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-zinc-100">
                                    Revoke API Key?
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    Key: <span className="font-mono text-zinc-200">{keyToRevoke.keyPrefix}</span>
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
                            Any SDK instance or service actively reporting errors with this key will immediately be rejected with an Unauthorized error.
                        </p>

                        {revokeError && (
                            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                                {revokeError}
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setKeyToRevoke(null)}
                                disabled={isRevoking}
                                className="px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRevokeKey}
                                disabled={isRevoking}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
                            >
                                {isRevoking ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Revoking...</span>
                                    </>
                                ) : (
                                    <span>Confirm Revocation</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
