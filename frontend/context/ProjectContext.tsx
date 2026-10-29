"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiRequest, ApiError } from "@/utils/api";
import type { Project } from "@/utils/types";

interface ProjectContextValue {
    projects: Project[];
    selectedProject: Project | null;
    selectedProjectId: string | null;
    setSelectedProjectId: (id: string) => void;
    isLoading: boolean;
    error: string | null;
    refreshProjects: () => Promise<void>;
    createProject: (name: string) => Promise<Project>;
    isCreateModalOpen: boolean;
    setIsCreateModalOpen: (open: boolean) => void;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

const STORAGE_KEY = "crashly_selected_project_id";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const { getToken, isSignedIn, isLoaded } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

    const setSelectedProjectId = useCallback((id: string) => {
        setSelectedProjectIdState(id);
        if (typeof window !== "undefined") {
            try {
                localStorage.setItem(STORAGE_KEY, id);
            } catch {
                // Ignore localStorage errors
            }
        }
    }, []);

    const fetchProjects = useCallback(async () => {
        if (!isLoaded || !isSignedIn) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const token = await getToken();
            const data = await apiRequest<{ projects: Project[] }>("/dashboard/projects", token);
            const list = data.projects || [];
            setProjects(list);

            if (list.length > 0) {
                let savedId: string | null = null;
                if (typeof window !== "undefined") {
                    try {
                        savedId = localStorage.getItem(STORAGE_KEY);
                    } catch {
                        savedId = null;
                    }
                }
                const match = list.find((p) => p.id === savedId);
                if (match) {
                    setSelectedProjectIdState(match.id);
                } else {
                    setSelectedProjectIdState(list[0].id);
                    if (typeof window !== "undefined") {
                        try {
                            localStorage.setItem(STORAGE_KEY, list[0].id);
                        } catch {}
                    }
                }
            } else {
                setSelectedProjectIdState(null);
            }
        } catch (err: any) {
            console.error("Failed to fetch projects:", err);
            setError(err instanceof ApiError ? err.message : "Failed to load projects");
        } finally {
            setIsLoading(false);
        }
    }, [getToken, isLoaded, isSignedIn]);

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            fetchProjects();
        } else if (isLoaded && !isSignedIn) {
            setIsLoading(false);
            setProjects([]);
            setSelectedProjectIdState(null);
        }
    }, [isLoaded, isSignedIn, fetchProjects]);

    const createProject = async (name: string): Promise<Project> => {
        const trimmed = name.trim();
        if (!trimmed) {
            throw new Error("Project name is required");
        }

        const token = await getToken();
        const data = await apiRequest<{ project: Project }>("/dashboard/projects", token, {
            method: "POST",
            body: JSON.stringify({ name: trimmed })
        });

        const newProject = data.project;
        setProjects((prev) => [newProject, ...prev]);
        setSelectedProjectId(newProject.id);
        setIsCreateModalOpen(false);
        return newProject;
    };

    const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

    return (
        <ProjectContext.Provider
            value={{
                projects,
                selectedProject,
                selectedProjectId,
                setSelectedProjectId,
                isLoading,
                error,
                refreshProjects: fetchProjects,
                createProject,
                isCreateModalOpen,
                setIsCreateModalOpen
            }}
        >
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error("useProject must be used within a ProjectProvider");
    }
    return context;
}
