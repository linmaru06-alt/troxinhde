import { create } from 'zustand';

export interface ConfirmDialogConfig {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isDangerous?: boolean;
}

export interface UIStore {
  // === PANELS ===
  isNotificationPanelOpen: boolean;
  isChatPanelOpen: boolean;
  isFilterSidebarOpen: boolean;
  isMapPopupOpen: boolean;
  activeMapRoomId: string | null;

  // === DROPDOWNS ===
  isAvatarDropdownOpen: boolean;
  isSortDropdownOpen: boolean;
  isFilterDropdownOpen: boolean;
  activeDropdownId: string | null;

  // === MODALS ===
  isLoginGateOpen: boolean;
  loginGateTrigger: string | null;
  isReportModalOpen: boolean;
  reportTargetId: string | null;
  isConfirmDialogOpen: boolean;
  confirmDialogConfig: ConfirmDialogConfig | null;

  // === MOBILE ===
  isMobileFilterOpen: boolean;
  isMobileMenuOpen: boolean;
  activeMobileSheet: string | null;

  // === SEARCH ===
  isSearchSuggestionsOpen: boolean;

  // === ACTIONS ===
  closeAll: () => void;
  closeAllPanels: () => void;
  closeAllDropdowns: () => void;
  closeAllSheets: () => void;

  toggleNotificationPanel: () => void;
  toggleChatPanel: () => void;
  toggleFilterSidebar: () => void;
  toggleAvatarDropdown: () => void;
  toggleMobileFilter: () => void;
  toggleMobileMenu: () => void;

  openLoginGate: (trigger?: string) => void;
  openReportModal: (targetId: string) => void;
  openConfirmDialog: (config: ConfirmDialogConfig) => void;
  openMobileSheet: (sheetName: string) => void;
  setActiveMapRoom: (roomId: string | null) => void;
  setActiveDropdown: (dropdownId: string | null) => void;
  setSearchSuggestionsOpen: (open: boolean) => void;

  closeLoginGate: () => void;
  closeReportModal: () => void;
  closeConfirmDialog: () => void;
  closeMobileSheet: () => void;
  closeMapPopup: () => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  isNotificationPanelOpen: false,
  isChatPanelOpen: false,
  isFilterSidebarOpen: false,
  isMapPopupOpen: false,
  activeMapRoomId: null,

  isAvatarDropdownOpen: false,
  isSortDropdownOpen: false,
  isFilterDropdownOpen: false,
  activeDropdownId: null,

  isLoginGateOpen: false,
  loginGateTrigger: null,
  isReportModalOpen: false,
  reportTargetId: null,
  isConfirmDialogOpen: false,
  confirmDialogConfig: null,

  isMobileFilterOpen: false,
  isMobileMenuOpen: false,
  activeMobileSheet: null,

  isSearchSuggestionsOpen: false,

  // Đóng tất cả elements khi điều hướng trang
  closeAll: () =>
    set({
      isNotificationPanelOpen: false,
      isChatPanelOpen: false,
      isFilterSidebarOpen: false,
      isMapPopupOpen: false,
      activeMapRoomId: null,
      isAvatarDropdownOpen: false,
      isSortDropdownOpen: false,
      isFilterDropdownOpen: false,
      activeDropdownId: null,
      isLoginGateOpen: false,
      loginGateTrigger: null,
      isReportModalOpen: false,
      reportTargetId: null,
      isConfirmDialogOpen: false,
      confirmDialogConfig: null,
      isMobileFilterOpen: false,
      isMobileMenuOpen: false,
      activeMobileSheet: null,
      isSearchSuggestionsOpen: false,
    }),

  // Đóng panels
  closeAllPanels: () =>
    set({
      isNotificationPanelOpen: false,
      isChatPanelOpen: false,
      isFilterSidebarOpen: false,
      isMapPopupOpen: false,
      activeMapRoomId: null,
    }),

  // Đóng dropdowns
  closeAllDropdowns: () =>
    set({
      isAvatarDropdownOpen: false,
      isSortDropdownOpen: false,
      isFilterDropdownOpen: false,
      activeDropdownId: null,
      isSearchSuggestionsOpen: false,
    }),

  // Đóng mobile sheets
  closeAllSheets: () =>
    set({
      isMobileFilterOpen: false,
      isMobileMenuOpen: false,
      activeMobileSheet: null,
    }),

  toggleNotificationPanel: () => {
    const { isNotificationPanelOpen, closeAllPanels, closeAllDropdowns } = get();
    closeAllDropdowns();
    if (!isNotificationPanelOpen) closeAllPanels();
    set({ isNotificationPanelOpen: !isNotificationPanelOpen });
  },

  toggleChatPanel: () => {
    const { isChatPanelOpen, closeAllPanels, closeAllDropdowns } = get();
    closeAllDropdowns();
    if (!isChatPanelOpen) closeAllPanels();
    set({ isChatPanelOpen: !isChatPanelOpen });
  },

  toggleFilterSidebar: () => {
    const { isFilterSidebarOpen } = get();
    set({ isFilterSidebarOpen: !isFilterSidebarOpen });
  },

  toggleAvatarDropdown: () => {
    const { isAvatarDropdownOpen, closeAllDropdowns, closeAllPanels } = get();
    closeAllPanels();
    if (!isAvatarDropdownOpen) closeAllDropdowns();
    set({ isAvatarDropdownOpen: !isAvatarDropdownOpen });
  },

  toggleMobileFilter: () => {
    const { isMobileFilterOpen } = get();
    set({
      isMobileFilterOpen: !isMobileFilterOpen,
      isMobileMenuOpen: false,
      activeMobileSheet: null,
    });
  },

  toggleMobileMenu: () => {
    const { isMobileMenuOpen } = get();
    set({
      isMobileMenuOpen: !isMobileMenuOpen,
      isMobileFilterOpen: false,
      activeMobileSheet: null,
    });
  },

  openLoginGate: (trigger) => {
    get().closeAllPanels();
    get().closeAllDropdowns();
    set({ isLoginGateOpen: true, loginGateTrigger: trigger || null });
  },

  openReportModal: (targetId) =>
    set({
      isReportModalOpen: true,
      reportTargetId: targetId,
    }),

  openConfirmDialog: (config) =>
    set({
      isConfirmDialogOpen: true,
      confirmDialogConfig: config,
    }),

  openMobileSheet: (sheetName) =>
    set({
      activeMobileSheet: sheetName,
      isMobileMenuOpen: false,
      isMobileFilterOpen: false,
    }),

  setActiveMapRoom: (roomId) =>
    set({
      activeMapRoomId: roomId,
      isMapPopupOpen: !!roomId,
    }),

  setActiveDropdown: (dropdownId) => {
    if (dropdownId) get().closeAllPanels();
    set({ activeDropdownId: dropdownId });
  },

  setSearchSuggestionsOpen: (open) => set({ isSearchSuggestionsOpen: open }),

  closeLoginGate: () => set({ isLoginGateOpen: false, loginGateTrigger: null }),
  closeReportModal: () => set({ isReportModalOpen: false, reportTargetId: null }),
  closeConfirmDialog: () => set({ isConfirmDialogOpen: false, confirmDialogConfig: null }),
  closeMobileSheet: () => set({ activeMobileSheet: null, isMobileMenuOpen: false, isMobileFilterOpen: false }),
  closeMapPopup: () => set({ isMapPopupOpen: false, activeMapRoomId: null }),
}));
