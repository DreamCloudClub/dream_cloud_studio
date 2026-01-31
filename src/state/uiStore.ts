import { create } from "zustand"

interface UIState {
  // Bubble panel (left)
  isBubbleCollapsed: boolean
  toggleBubbleCollapsed: () => void
  setBubbleCollapsed: (collapsed: boolean) => void
  // Inspector panel (right)
  isInspectorCollapsed: boolean
  toggleInspectorCollapsed: () => void
  setInspectorCollapsed: (collapsed: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  // Bubble panel (left)
  isBubbleCollapsed: false,
  toggleBubbleCollapsed: () => set((state) => ({ isBubbleCollapsed: !state.isBubbleCollapsed })),
  setBubbleCollapsed: (collapsed) => set({ isBubbleCollapsed: collapsed }),
  // Inspector panel (right)
  isInspectorCollapsed: false,
  toggleInspectorCollapsed: () => set((state) => ({ isInspectorCollapsed: !state.isInspectorCollapsed })),
  setInspectorCollapsed: (collapsed) => set({ isInspectorCollapsed: collapsed }),
}))
