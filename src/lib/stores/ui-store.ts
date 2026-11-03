import { create } from "zustand";

interface UiState {
  // Responsive sidebar
  isMobileSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;

  // Active view tab
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Active Project filter
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;

  // Global search & command palette
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;

  // Marketing & Showcase Carousel
  isMarketingModalOpen: boolean;
  setIsMarketingModalOpen: (open: boolean) => void;
  toggleMarketingModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isMobileSidebarOpen: false,
  isSidebarCollapsed: false,
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  toggleSidebarCollapsed: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  activeTab: "overview",
  setActiveTab: (tab) => set({ activeTab: tab, isMobileSidebarOpen: false }),

  activeProjectId: null,
  setActiveProjectId: (id) => set({ activeProjectId: id }),

  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  isSearchOpen: false,
  setIsSearchOpen: (open) => set({ isSearchOpen: open }),

  isMarketingModalOpen: false,
  setIsMarketingModalOpen: (open) => set({ isMarketingModalOpen: open }),
  toggleMarketingModal: () => set((state) => ({ isMarketingModalOpen: !state.isMarketingModalOpen })),
}));
