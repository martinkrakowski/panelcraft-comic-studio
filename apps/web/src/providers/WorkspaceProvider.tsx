"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { useProjects } from "../lib/hooks/useProjects";
import { ProjectSummaryDTO } from "@panelcraft/types";

interface WorkspaceContextType {
  projects: ProjectSummaryDTO[];
  loadingProjects: boolean;
  errorProjects: Error | null;
  refetchProjects: () => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

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

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
