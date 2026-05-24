"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { useProjects } from "../lib/hooks/useProjects";
import { ProjectSummaryDTO } from "@panelcraft/types";

type UseProjectsResult = ReturnType<typeof useProjects>;

interface WorkspaceContextType {
  projects: UseProjectsResult["projects"];
  loadingProjects: UseProjectsResult["loading"];
  errorProjects: UseProjectsResult["error"];
  refetchProjects: UseProjectsResult["refetch"];
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

/**
 * React context provider component that encapsulates global projects state 
 * and active workspace variables, making them accessible to descendent components.
 * 
 * @component
 * @param props - Component properties.
 * @param props.children - Child React node elements to wrap.
 * @returns React.Element context provider container wrapper.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { projects, loading: loadingProjects, error: errorProjects, refetch: refetchProjects } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  return (
    <WorkspaceContext.Provider
      value={{
        projects,
        loadingProjects,
        errorProjects,
        refetchProjects,
        activeProjectId,
        setActiveProjectId,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * Context consumer hook to fetch active project summaries and loading/error states.
 * Must be executed within a WorkspaceProvider tree.
 * 
 * @returns Active projects context containing summaries lists and status triggers.
 * @throws {Error} if hook is invoked outside of the WorkspaceProvider context.
 */
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
