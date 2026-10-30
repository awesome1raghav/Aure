"use client";

import { create } from "zustand";

export interface Toast {
  id: number;
  title: string;
  detail: string;
  swatch?: string;
}

interface UIState {
  /** preloader finished */
  loaded: boolean;
  /** hero shirt has painted its first frame */
  sceneReady: boolean;
  /** page transition target */
  transition: { href: string; label: string } | null;
  toast: Toast | null;
  menuOpen: boolean;
  setLoaded: () => void;
  setSceneReady: () => void;
  go: (href: string, label?: string) => void;
  endTransition: () => void;
  showToast: (t: Omit<Toast, "id">) => void;
  hideToast: () => void;
  setMenu: (open: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  loaded: false,
  sceneReady: false,
  transition: null,
  toast: null,
  menuOpen: false,
  setLoaded: () => set({ loaded: true }),
  setSceneReady: () => set({ sceneReady: true }),
  go: (href, label = "") => set({ transition: { href, label }, menuOpen: false }),
  endTransition: () => set({ transition: null }),
  showToast: (t) => set({ toast: { ...t, id: Date.now() } }),
  hideToast: () => set({ toast: null }),
  setMenu: (open) => set({ menuOpen: open }),
}));
