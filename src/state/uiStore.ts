import { create } from "zustand"

interface UIState {
  // Bubble panel
  isBubbleCollapsed: boolean
  toggleBubbleCollapsed: () => void
  setBubbleCollapsed: (collapsed: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  // Bubble panel
  isBubbleCollapsed: false,
  toggleBubbleCollapsed: () => set((state) => ({ isBubbleCollapsed: !state.isBubbleCollapsed })),
  setBubbleCollapsed: (collapsed) => set({ isBubbleCollapsed: collapsed }),
}))
