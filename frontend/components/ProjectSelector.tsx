"use client";

import React, { useState, useRef, useEffect } from "react";
import { useProject } from "@/context/ProjectContext";
import { Check, ChevronDown, Plus, FolderKanban } from "lucide-react";

export function ProjectSelector() {
    const {
        projects,
        selectedProject,
        selectedProjectId,
        setSelectedProjectId,
        isLoading,
        setIsCreateModalOpen
    } = useProject();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg animate-pulse">
                <div className="w-4 h-4 bg-zinc-800 rounded" />
                <div className="w-24 h-4 bg-zinc-800 rounded" />
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 rounded-lg text-xs font-medium transition-all"
            >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Project</span>
            </button>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 rounded-lg text-left transition-colors"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300 shrink-0">
                        <FolderKanban className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-sm font-medium text-zinc-200 truncate">
                        {selectedProject?.name || "Select Project"}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div
                    className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 text-sm text-zinc-200 overflow-hidden"
                    role="listbox"
                >
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Projects
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-zinc-800/40">
                        {projects.map((project) => {
                            const isSelected = project.id === selectedProjectId;
                            return (
                                <button
                                    key={project.id}
                                    onClick={() => {
                                        setSelectedProjectId(project.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors hover:bg-zinc-800/70 ${
                                        isSelected ? "bg-zinc-800/40 text-emerald-400 font-medium" : "text-zinc-300"
                                    }`}
                                    role="option"
                                    aria-selected={isSelected}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <FolderKanban className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-emerald-400" : "text-zinc-500"}`} />
                                        <span className="truncate">{project.name}</span>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-1.5 border-t border-zinc-800 mt-1">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                setIsCreateModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Create New Project</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
