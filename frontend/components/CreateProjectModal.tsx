"use client";

import React, { useState } from "react";
import { useProject } from "@/context/ProjectContext";
import { X, FolderPlus, Loader2 } from "lucide-react";

export function CreateProjectModal() {
    const { isCreateModalOpen, setIsCreateModalOpen, createProject } = useProject();
    const [name, setName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isCreateModalOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            setError("Project name cannot be empty");
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            await createProject(trimmed);
            setName("");
        } catch (err: any) {
            setError(err.message || "Failed to create project");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div
                className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 text-zinc-100"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-project-title"
            >
                <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded-lg hover:bg-zinc-800"
                    aria-label="Close"
                    disabled={isSubmitting}
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <FolderPlus className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 id="create-project-title" className="text-lg font-semibold text-zinc-100">
                            Create New Project
                        </h2>
                        <p className="text-xs text-zinc-400">
                            Organize errors and monitor real-time issues
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="project-name" className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5">
                            Project Name
                        </label>
                        <input
                            id="project-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. production-api, web-app"
                            autoFocus
                            disabled={isSubmitting}
                            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !name.trim()}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors shadow-sm shadow-emerald-950"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Project"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
