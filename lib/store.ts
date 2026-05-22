/**
 * @file Zustand Global Store.
 * @description Centralized state management for user sessions, environments,
 * and active IDE workspace details.
 */

import { create } from "zustand";
import type { EnvironmentStatus } from "@/types";

export interface EnvironmentData {
  id: string;
  name: string;
  image: string;
  status: EnvironmentStatus;
  containerId: string | null;
  createdAt: string;
}

export interface UserSession {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface AppState {
  user: UserSession | null;
  environments: EnvironmentData[];
  isEnvironmentsLoading: boolean;
  environmentsError: string | null;
  
  activeEnvironment: EnvironmentData | null;
  isActiveEnvironmentLoading: boolean;
  activeEnvironmentError: string | null;
  
  selectedFile: string | null;
  
  setUser: (user: UserSession | null) => void;
  fetchEnvironments: () => Promise<void>;
  fetchActiveEnvironment: (envId: string) => Promise<void>;
  startActiveEnvironment: (envId: string) => Promise<void>;
  setSelectedFile: (path: string | null) => void;
  clearWorkspace: () => void;
}

/**
 * @description The global state hook.
 */
export const useStore = create<AppState>((set, get) => ({
  user: null,
  environments: [],
  isEnvironmentsLoading: true,
  environmentsError: null,
  
  activeEnvironment: null,
  isActiveEnvironmentLoading: true,
  activeEnvironmentError: null,
  
  selectedFile: null,

  setUser: (user) => set({ user }),

  fetchEnvironments: async () => {
    // Prevent overlapping network requests (e.g. from React Strict Mode double-mounts)
    if ((globalThis as any)._fetchEnvironmentsPromise) {
      return (globalThis as any)._fetchEnvironmentsPromise;
    }

    const promise = (async () => {
      set({ isEnvironmentsLoading: true, environmentsError: null });
      try {
        const res = await fetch("/api/environments");
        const data = await res.json();
        if (data.success) {
          set({ environments: data.data, isEnvironmentsLoading: false });
        } else {
          set({ environmentsError: data.error || "Failed to load environments", isEnvironmentsLoading: false });
        }
      } catch {
        set({ environmentsError: "Failed to communicate with server", isEnvironmentsLoading: false });
      } finally {
        (globalThis as any)._fetchEnvironmentsPromise = null;
      }
    })();

    (globalThis as any)._fetchEnvironmentsPromise = promise;
    return promise;
  },

  fetchActiveEnvironment: async (envId) => {
    const cacheKey = `_fetchActiveEnvPromise_${envId}`;
    if ((globalThis as any)[cacheKey]) {
      return (globalThis as any)[cacheKey];
    }

    const promise = (async () => {
      set({ isActiveEnvironmentLoading: true, activeEnvironmentError: null });
      try {
        const res = await fetch(`/api/environments/${envId}`);
        const data = await res.json();
        if (data.success) {
          set({ activeEnvironment: data.data, isActiveEnvironmentLoading: false });
        } else {
          set({ activeEnvironmentError: data.error || "Failed to load environment", isActiveEnvironmentLoading: false });
        }
      } catch {
        set({ activeEnvironmentError: "Network error", isActiveEnvironmentLoading: false });
      } finally {
        (globalThis as any)[cacheKey] = null;
      }
    })();

    (globalThis as any)[cacheKey] = promise;
    return promise;
  },

  startActiveEnvironment: async (envId) => {
    try {
      const res = await fetch(`/api/environments/${envId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      if (data.success) {
        set({ activeEnvironment: data.data });
      }
    } catch (err) {
      console.error("Failed to start environment:", err);
    }
  },

  setSelectedFile: (path) => set({ selectedFile: path }),

  clearWorkspace: () => set({ 
    activeEnvironment: null, 
    activeEnvironmentError: null, 
    selectedFile: null 
  }),
}));
