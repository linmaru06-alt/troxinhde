import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User,
  UserRole,
  OwnerApplication,
  Building,
  Room,
  RoommatePost,
  
  MarketplaceItem,
  NotificationItem,
  BookingRequest,
  ReportItem,
  SubscriptionPlanId,
  SubscriptionPlan,
  PaymentMethod,
  PaymentTransaction,
  OwnerSubscription,
} from '../types';
import {
  initialUsers,
  initialOwnerApplications,
  initialBuildings,
  initialRooms,
  initialRoommates,
  initialMarketplaceItems,
  initialNotifications,
} from '../data/mockData';
import { signOut } from '../lib/api/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { logoutAuth } from '../lib/authService';
import { resolveUserIdToUuid } from '../lib/api/messages';
import { syncUserToSupabase } from '../lib/supabaseAuthSync';
import {
  fetchRoomsFromSupabase,
  fetchBuildingsFromSupabase,
  fetchRoommatesFromSupabase,
  fetchMarketplaceItemsFromSupabase,
  syncRoomToSupabase,
  syncRoommatePostToSupabase,
  syncMarketplaceItemToSupabase,
} from '../lib/supabaseDataService';
import { toggleSaveRoom as apiToggleSaveRoom, getSavedRooms } from '../lib/api/rooms';
import {
  blockUser as apiBlockUser,
  unblockUser as apiUnblockUser,
  fetchBlockedUsers as apiFetchBlockedUsers,
  hideMarketplaceItem as apiHideMarketplaceItem,
  unhideMarketplaceItem as apiUnhideMarketplaceItem,
  fetchHiddenItemIds as apiFetchHiddenItemIds,
  fetchHiddenItems as apiFetchHiddenItems,
  BlockedUserRecord,
  HiddenItemRecord,
} from '../lib/api/blocksAndHides';
import { onAutoModerationTriggered } from '../lib/api/reports';

export type { BlockedUserRecord, HiddenItemRecord };

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Gói Miễn Phí',
    price: 0,
    period: 'Vĩnh viễn',
    roomLimit: 2,
    badge: 'Khởi đầu',
    features: [
      'Đăng tối đa 02 phòng trọ',
      'Được kiểm duyệt 100% PCCC',
      'Hộp thư tin nhắn với khách thuê',
      'Quản lý trạng thái phòng cơ bản',
    ],
    description: 'Dành cho chủ trọ cá nhân có 1-2 phòng lẻ cần cho thuê nhanh.',
  },
  {
    id: 'basic',
    name: 'Gói Cơ Bản',
    price: 99000,
    originalPrice: 149000,
    period: 'Tháng',
    roomLimit: 10,
    popular: true,
    badge: 'Phổ biến nhất 🔥',
    features: [
      'Đăng tối đa 10 phòng trọ',
      'Tặng 01 lượt Đẩy Tin Nổi Bật 3 ngày/tháng',
      'Ưu tiên duyệt tin trong 2 giờ',
      'Thống kê số lượt xem & lưu phòng',
      'Hỗ trợ kỹ thuật 24/7',
    ],
    description: 'Lựa chọn lý tưởng cho các chủ nhà trọ quản lý 1-2 tòa nhà vừa và nhỏ.',
  },
  {
    id: 'pro',
    name: 'Gói Chuyên Nghiệp (Pro VIP)',
    price: 299000,
    originalPrice: 450000,
    period: 'Tháng',
    roomLimit: 999,
    badge: 'Dành cho chuỗi căn hộ ⭐',
    features: [
      'Không giới hạn số lượng phòng & tòa nhà',
      'Tặng 05 lượt Đẩy Tin Nổi Bật VIP mỗi tháng',
      'Huy hiệu "Đối Tác Vàng 5★" trên tất cả tin đăng',
      'Tự động duyệt tin đăng ngay lập tức (AI Auto-Approve)',
      'Phân tích chi tiết nguồn khách thuê & doanh thu',
      'Chuyên viên CSKH riêng chăm sóc tài khoản',
    ],
    description: 'Dành cho chuỗi căn hộ dịch vụ, chung cư mini, nhà trọ quy mô lớn.',
  },
];

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppState {
  currentUser: User | null;
  ownerApplications: OwnerApplication[];
  rooms: Room[];
  buildings: Building[];
  roommates: RoommatePost[];
  marketplaceItems: MarketplaceItem[];
  notifications: NotificationItem[];
  savedRoomIds: string[];
  savedRoommateIds: string[];
  savedItemIds: string[];
  bookings: BookingRequest[];
  reports: ReportItem[];
  toasts: Toast[];

  // Payment & Subscription
  ownerSubscription: OwnerSubscription;
  paymentTransactions: PaymentTransaction[];
  plans: SubscriptionPlan[];
  upgradeSubscription: (planId: SubscriptionPlanId, method: PaymentMethod, amount: number) => PaymentTransaction;
  cancelSubscription: () => void;
  boostRoom: (roomId: string, days: number, boostTitle: string, amount: number, method: PaymentMethod) => PaymentTransaction;
  validateCoupon: (code: string) => { valid: boolean; discountPercent: number; message: string };

  // Auth & Permissions
  setCurrentUser: (user: User | null) => void;
  loginAsRole: (role: UserRole) => void;
  loginWithPhone: (phone: string, roleHint?: UserRole, nameHint?: string, emailHint?: string) => boolean;
  loginWithSocialUser: (userData: {
    id: string;
    firebaseUid?: string;
    name: string;
    email?: string;
    phone?: string;
    role?: UserRole;
    avatarUrl?: string;
    isDemoAccount?: boolean;
    emailVerified?: boolean;
    phoneVerified?: boolean;
  }) => void;
  registerUser: (data: { name: string; phone: string; email?: string; id?: string; role?: UserRole }) => User;
  logout: () => void;

  // Local persistence for newly created items (to survive reloads before cloud sync)
  localCreatedRooms: Room[];
  localCreatedBuildings: Building[];
  localCreatedRoommates: RoommatePost[];
  localCreatedItems: MarketplaceItem[];

  // Owner Upgrade Applications
  submitOwnerApplication: (data: {
    buildingName: string;
    address: string;
    district: string;
    totalRooms: number;
    cccdNumber: string;
    legalDocsNote?: string;
  }) => string;
  approveOwnerApplication: (applicationId: string) => void;
  rejectOwnerApplication: (applicationId: string, reason: string) => void;

  // Saved toggles
  toggleSaveRoom: (roomId: string) => boolean;
  toggleSaveRoommate: (id: string) => boolean;
  toggleSaveItem: (id: string) => boolean;
  syncSavedRooms: (userId: string) => Promise<void>;

  // User Blocking & Hidden Items
  blockedUserIds: string[];
  hiddenItemIds: string[];
  blockedUsersDetailed: BlockedUserRecord[];
  hiddenItemsDetailed: HiddenItemRecord[];
  blockUser: (targetUserId: string, targetUserName?: string) => Promise<void>;
  unblockUser: (targetUserId: string) => Promise<void>;
  isUserBlocked: (targetUserId: string) => boolean;
  hideItem: (targetItemId: string, targetItemTitle?: string) => Promise<void>;
  unhideItem: (targetItemId: string) => Promise<void>;
  isItemHidden: (targetItemId: string) => boolean;
  syncBlocksAndHides: (userId: string) => Promise<void>;

  // Room & Building management
  addBuilding: (building: Omit<Building, 'id'>) => string;
  removeBuilding: (id: string) => void;
  addRoom: (room: Omit<Room, 'id' | 'views' | 'savedCount' | 'createdAt'>) => string;
  removeRoom: (id: string) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  updateRoomStatus: (roomId: string, status: Room['status']) => void;
  approveRoom: (roomId: string) => void;
  rejectRoom: (roomId: string, reason: string) => void;

  // Community & Marketplace
  addRoommatePost: (post: Omit<RoommatePost, 'id' | 'createdAt'> & { id?: string }) => string;
  removeRoommatePost: (id: string) => void;
  addMarketplaceItem: (item: Omit<MarketplaceItem, 'id' | 'createdAt'>) => string;
  removeMarketplaceItem: (id: string) => void;
  updateMarketplaceItem: (itemId: string, updates: Partial<MarketplaceItem>) => void;
  approveMarketplaceItem: (itemId: string) => void;
  rejectMarketplaceItem: (itemId: string, reason: string) => void;
  resubmitMarketplaceItem: (itemId: string, updates: Partial<MarketplaceItem>) => void;
  autoModerateMarketplaceItem: (itemId: string, ownerId?: string) => void;

  // Bookings
  createBooking: (booking: Omit<BookingRequest, 'id' | 'createdAt' | 'status'>) => string;
  updateBookingStatus: (bookingId: string, status: BookingRequest['status'], note?: string) => void;

  // Reports
  addReport: (report: Omit<ReportItem, 'id' | 'createdAt' | 'status'>) => string;
  resolveReport: (reportId: string, action: 'hide_listing' | 'dismiss') => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Toast
  showToast: (title: string, description?: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  // Supabase Cloud Sync
  fetchInitialCloudData: () => Promise<void>;

  // Debug & Reset
  resetAllData: () => void;
}

const isDev = Boolean(import.meta.env?.DEV);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null, // Default guest unauthenticated state
      ownerApplications: isDev ? initialOwnerApplications : [],
      rooms: isDev ? initialRooms : [],
      buildings: isDev ? initialBuildings : [],
      roommates: isDev ? initialRoommates : [],
      marketplaceItems: isDev ? initialMarketplaceItems : [],
      notifications: isDev ? initialNotifications : [],
      savedRoomIds: [],
      savedRoommateIds: [],
      savedItemIds: [],
      blockedUserIds: [],
      hiddenItemIds: [],
      blockedUsersDetailed: [],
      hiddenItemsDetailed: [],
      bookings: [],
      localCreatedRooms: [],
      localCreatedBuildings: [],
      localCreatedRoommates: [],
      localCreatedItems: [],
      reports: [
        {
          id: 'rep_1',
          targetId: 'room_1',
          targetTitle: 'Phòng Studio Full Đồ Ban Công Thoáng Mát',
          targetType: 'room',
          reporterName: 'Nguyễn Thùy Linh',
          reporterPhone: '0977112233',
          reason: 'Chủ nhà thu phụ phí trái quy định',
          detail: 'Chủ nhà yêu cầu đóng thêm 300k tiền dọn vệ sinh hành lang mà không báo trước trong tin đăng.',
          status: 'pending',
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
      ],
      toasts: [],

      // Payment & Subscription Initial State
      plans: SUBSCRIPTION_PLANS,
      ownerSubscription: {
        planId: 'free',
        status: 'active',
        expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
        autoRenew: true,
        startedAt: new Date().toISOString(),
      },
      paymentTransactions: [
        {
          id: 'tx_demo_1',
          userId: 'user_owner_1',
          userName: 'Trần Quốc Tuấn',
          orderId: 'TRX_889201',
          orderInfo: 'Nâng cấp Gói Cơ Bản (1 Tháng)',
          amount: 99000,
          method: 'momo',
          status: 'success',
          planId: 'basic',
          createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        },
      ],

      upgradeSubscription: (planId, method, amount) => {
        const { currentUser, showToast } = get();
        const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[1];
        const newExpiry = new Date(Date.now() + 30 * 86400000).toISOString();

        const newTx: PaymentTransaction = {
          id: `tx_${Date.now()}`,
          userId: currentUser?.id || 'user_owner_1',
          userName: currentUser?.name || 'Chủ Trọ',
          orderId: `TRX_${Date.now().toString().slice(-6)}`,
          orderInfo: `Nâng cấp ${plan.name}`,
          amount,
          method,
          status: 'success',
          planId,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          ownerSubscription: {
            planId,
            status: 'active',
            expiresAt: newExpiry,
            autoRenew: true,
            startedAt: new Date().toISOString(),
          },
          paymentTransactions: [newTx, ...state.paymentTransactions],
          notifications: [
            {
              id: `notif_${Date.now()}`,
              userId: currentUser?.id || 'user_owner_1',
              title: `Nâng cấp ${plan.name} thành công! 🎉`,
              body: `Tài khoản của bạn đã được nâng cấp lên hạn mức ${plan.roomLimit === 999 ? 'không giới hạn' : plan.roomLimit} phòng trọ.`,
              type: 'upgrade',
              read: false,
              ctaUrl: '/chu-tro/quan-ly-goi',
              ctaLabel: 'Quản lý gói',
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ],
        }));

        showToast(`Thanh toán thành công! 🎉`, `Bạn đã kích hoạt thành công ${plan.name}`, 'success');
        return newTx;
      },

      cancelSubscription: () => {
        set((state) => ({
          ownerSubscription: {
            ...state.ownerSubscription,
            autoRenew: false,
          },
        }));
        get().showToast('Đã tắt tính năng tự động gia hạn', 'Gói hiện tại sẽ duy trì đến hết chu kỳ.', 'info');
      },

      boostRoom: (roomId, days, boostTitle, amount, method) => {
        const { currentUser, rooms, showToast } = get();
        const room = rooms.find((r) => r.id === roomId);
        const boostExpiry = new Date(Date.now() + days * 86400000).toISOString();

        const newTx: PaymentTransaction = {
          id: `tx_boost_${Date.now()}`,
          userId: currentUser?.id || 'user_owner_1',
          userName: currentUser?.name || 'Chủ Trọ',
          orderId: `BST_${Date.now().toString().slice(-6)}`,
          orderInfo: `Đẩy tin "${room?.title || 'Phòng'}" (${days} ngày)`,
          amount,
          method,
          status: 'success',
          roomId,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId
              ? {
                  ...r,
                  isBoosted: true,
                  boostExpiresAt: boostExpiry,
                  boostBadge: 'Tin Nổi Bật',
                }
              : r
          ),
          paymentTransactions: [newTx, ...state.paymentTransactions],
          notifications: [
            {
              id: `notif_${Date.now()}`,
              userId: currentUser?.id || 'user_owner_1',
              title: `Đẩy tin phòng trọ thành công! 🚀`,
              body: `Tin đăng "${room?.title}" sẽ được ưu tiên hiển thị đầu tiên trên trang tìm kiếm trong ${days} ngày.`,
              type: 'system',
              read: false,
              ctaUrl: `/phong/${roomId}`,
              ctaLabel: 'Xem tin phòng',
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ],
        }));

        showToast('Đẩy tin thành công! 🚀', `Tin đăng của bạn đã được đưa lên vị trí nổi bật`, 'success');
        return newTx;
      },

      validateCoupon: (code: string) => {
        const cleaned = code.trim().toUpperCase();
        if (cleaned === 'TROXINH50' || cleaned === 'TROXINH') {
          return { valid: true, discountPercent: 50, message: 'Áp dụng mã giảm giá 50% thành công! 🎉' };
        }
        if (cleaned === 'SINHVIEN' || cleaned === 'CHUTRO') {
          return { valid: true, discountPercent: 20, message: 'Áp dụng mã ưu đãi 20% thành công! ✨' };
        }
        return { valid: false, discountPercent: 0, message: 'Mã giảm giá không hợp lệ hoặc đã hết hạn.' };
      },

      setCurrentUser: (user) => {
        if (user) {
          const isSuperAdmin = user.email?.toLowerCase() === 'quan66934@gmail.com' || user.email?.toLowerCase() === 'admin@troxinh.vn';
          if (isSuperAdmin) {
            user.role = 'admin';
          }
        }
        set({ currentUser: user });
      },

      loginAsRole: (role) => {
        if (role === 'guest') {
          set({ currentUser: null });
          get().showToast('Đã chuyển sang chế độ Khách (chưa đăng nhập)', '', 'info');
          return;
        }
        const normalizedRole = role === 'renter' ? 'user' : role;
        const user = initialUsers.find((u) => u.role === normalizedRole) || initialUsers[0];
        set({ currentUser: { ...user, role: normalizedRole } });
        get().showToast(
          `Đăng nhập thành công với vai trò ${normalizedRole.toUpperCase()}`,
          `Chào mừng ${user.name}!`,
          'success'
        );
      },

      loginWithPhone: (phone, roleHint, nameHint, emailHint) => {
        const found = initialUsers.find((u) => u.phone === phone);
        if (found) {
          set({ currentUser: found });
          syncUserToSupabase({
            id: found.id,
            name: found.name,
            phone: found.phone,
            email: found.email,
            role: found.role as any,
            avatar_url: found.avatarUrl,
          });
          get().syncSavedRooms(found.id);
          get().syncBlocksAndHides(found.id);
          get().showToast(`Đăng nhập thành công`, `Chào mừng trở lại, ${found.name}!`, 'success');
          return true;
        }
        const targetRole: 'user' | 'owner' | 'admin' = roleHint === 'owner' ? 'owner' : roleHint === 'admin' ? 'admin' : 'user';
        const newUser: User = {
          id: `user_${Date.now()}`,
          name: nameHint || 'Người Dùng Trọ Xinh',
          phone,
          email: emailHint,
          role: targetRole,
          avatarUrl: '/images/user-avatar.jpg',
          verified: true,
          ownerApplicationStatus: targetRole === 'owner' ? 'approved' : 'none',
          createdAt: new Date().toISOString(),
        };
        set({ currentUser: newUser });
        syncUserToSupabase({
          id: newUser.id,
          name: newUser.name,
          phone: newUser.phone,
          email: newUser.email,
          role: newUser.role as any,
          avatar_url: newUser.avatarUrl,
        });
        get().syncSavedRooms(newUser.id);
        get().syncBlocksAndHides(newUser.id);
        get().showToast(`Đăng nhập thành công`, `Chào mừng bạn đến với Trọ Xinh!`, 'success');
        return true;
      },

      loginWithSocialUser: (userData) => {
        const isSuperAdmin = userData.email?.toLowerCase() === 'quan66934@gmail.com' || userData.email?.toLowerCase() === 'admin@troxinh.vn';
        const userRole: 'user' | 'owner' | 'admin' = isSuperAdmin ? 'admin' : (userData.role === 'owner' ? 'owner' : userData.role === 'admin' ? 'admin' : 'user');
        const userObj: User = {
          id: userData.id,
          firebaseUid: userData.firebaseUid,
          isDemoAccount: userData.isDemoAccount,
          name: userData.name || 'Người Dùng Trọ Xinh',
          email: userData.email,
          phone: userData.phone,
          role: userRole,
          avatarUrl: userData.avatarUrl || '/images/user-avatar.jpg',
          verified: true,
          emailVerified: userData.emailVerified,
          phoneVerified: userData.phoneVerified,
          ownerApplicationStatus: userRole === 'owner' ? 'approved' : 'none',
          createdAt: new Date().toISOString(),
        };
        set({ currentUser: userObj });
        get().syncSavedRooms(userObj.id);
        get().syncBlocksAndHides(userObj.id);
        get().showToast('Đăng nhập thành công! ✨', `Chào mừng ${userObj.name} quay lại.`, 'success');
      },

      registerUser: ({ name, phone, email, id, role }) => {
        const targetRole: 'user' | 'owner' | 'admin' = role === 'owner' ? 'owner' : role === 'admin' ? 'admin' : 'user';
        const newUser: User = {
          id: id || `user_${Date.now()}`,
          name,
          phone,
          email,
          role: targetRole,
          avatarUrl: '/images/user-avatar.jpg',
          verified: true,
          ownerApplicationStatus: targetRole === 'owner' ? 'pending' : 'none',
          createdAt: new Date().toISOString(),
        };
        set({ currentUser: newUser });
        syncUserToSupabase({
          id: newUser.id,
          name: newUser.name,
          phone: newUser.phone,
          email: newUser.email,
          role: targetRole,
          avatar_url: newUser.avatarUrl,
        });
        get().syncSavedRooms(newUser.id);
        get().syncBlocksAndHides(newUser.id);
        get().showToast(
          'Đăng ký tài khoản thành công! 🎉',
          `Chào mừng ${name} gia nhập cộng đồng Trọ Xinh.`,
          'success'
        );
        return newUser;
      },

      logout: () => {
        signOut().catch(() => {});
        logoutAuth().catch(() => {});
        set({ currentUser: null });
        get().showToast('Đã đăng xuất', 'Hẹn gặp lại bạn!', 'info');
      },

      // OWNER UPGRADE WORKFLOW
      submitOwnerApplication: (data) => {
        const { currentUser } = get();
        const appId = `app_${Date.now()}`;
        const newApp: OwnerApplication = {
          id: appId,
          userId: currentUser?.id || 'user_guest',
          userName: currentUser?.name || 'Khách',
          userPhone: currentUser?.phone || '0987654321',
          userEmail: currentUser?.email,
          buildingName: data.buildingName,
          address: data.address,
          district: data.district,
          totalRooms: data.totalRooms,
          cccdNumber: data.cccdNumber,
          legalDocsNote: data.legalDocsNote,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          ownerApplications: [newApp, ...state.ownerApplications],
          currentUser: state.currentUser
            ? { ...state.currentUser, ownerApplicationStatus: 'pending' }
            : null,
          notifications: [
            {
              id: `notif_${Date.now()}`,
              userId: currentUser?.id || 'user_guest',
              type: 'upgrade',
              title: 'Hồ sơ nâng cấp Chủ Trọ đã được gửi! ⏳',
              body: `Hồ sơ đăng ký cơ sở "${data.buildingName}" đang được Ban Quản Trị thẩm định trong 24h.`,
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ],
        }));

        get().showToast(
          'Đã gửi hồ sơ nâng cấp thành công!',
          'Ban Quản Trị sẽ liên hệ và phê duyệt trong vòng 24h.',
          'success'
        );
        return appId;
      },

      approveOwnerApplication: (applicationId) => {
        set((state) => {
          const app = state.ownerApplications.find((a) => a.id === applicationId);
          const updatedApps = state.ownerApplications.map((a) =>
            a.id === applicationId ? { ...a, status: 'approved' as const, reviewedAt: new Date().toISOString() } : a
          );

          // Update current user if matching
          let updatedUser = state.currentUser;
          if (updatedUser && app && updatedUser.id === app.userId) {
            updatedUser = { ...updatedUser, role: 'owner', ownerApplicationStatus: 'approved' };
          }

          return {
            ownerApplications: updatedApps,
            currentUser: updatedUser,
            notifications: [
              {
                id: `notif_${Date.now()}`,
                userId: app?.userId || 'user_renter_1',
                type: 'approval',
                title: 'Hồ sơ nâng cấp Chủ Trọ đã được duyệt! 🎉',
                body: `Chúc mừng bạn đã chính thức trở thành Đối Tác Chủ Trọ. Bây giờ bạn có thể đăng phòng và quản lý tòa nhà.`,
                read: false,
                actionLink: '/chu-tro',
                createdAt: new Date().toISOString(),
              },
              ...state.notifications,
            ],
          };
        });

        get().showToast(
          'Phê duyệt nâng cấp thành công! 🏢',
          'Người dùng đã được cấp quyền Chủ Trọ chính thức.',
          'success'
        );
      },

      rejectOwnerApplication: (applicationId, reason) => {
        set((state) => {
          const app = state.ownerApplications.find((a) => a.id === applicationId);
          const updatedApps = state.ownerApplications.map((a) =>
            a.id === applicationId
              ? {
                  ...a,
                  status: 'rejected' as const,
                  rejectionReason: reason,
                  reviewedAt: new Date().toISOString(),
                }
              : a
          );

          let updatedUser = state.currentUser;
          if (updatedUser && app && updatedUser.id === app.userId) {
            updatedUser = { ...updatedUser, ownerApplicationStatus: 'rejected', ownerApplicationReason: reason };
          }

          return {
            ownerApplications: updatedApps,
            currentUser: updatedUser,
            notifications: [
              {
                id: `notif_${Date.now()}`,
                userId: app?.userId || 'user_renter_1',
                type: 'rejected',
                title: 'Hồ sơ nâng cấp Chủ Trọ bị từ chối ❌',
                body: `Lý do: ${reason}. Vui lòng bổ sung hồ sơ và gửi lại.`,
                read: false,
                actionLink: '/nang-cap-chu-tro',
                createdAt: new Date().toISOString(),
              },
              ...state.notifications,
            ],
          };
        });

        get().showToast('Đã từ chối hồ sơ nâng cấp', `Lý do: ${reason}`, 'warning');
      },

      toggleSaveRoom: (roomId) => {
        const { savedRoomIds, currentUser, showToast } = get();
        if (!currentUser) {
          showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để lưu phòng trọ yêu thích', 'warning');
          return false;
        }
        const isSaved = savedRoomIds.includes(roomId);
        const next = isSaved ? savedRoomIds.filter((id) => id !== roomId) : [...savedRoomIds, roomId];
        set({ savedRoomIds: next });
        showToast(isSaved ? 'Đã xóa khỏi danh sách lưu' : 'Đã lưu phòng thành công ❤️', '', isSaved ? 'info' : 'success');
        apiToggleSaveRoom(currentUser.id, roomId).catch((err) => console.warn('Lỗi sync lưu phòng', err));
        return !isSaved;
      },

      toggleSaveRoommate: (id) => {
        const { savedRoommateIds, currentUser, showToast } = get();
        if (!currentUser) {
          showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để lưu bài tìm bạn ghép', 'warning');
          return false;
        }
        const isSaved = savedRoommateIds.includes(id);
        const next = isSaved ? savedRoommateIds.filter((item) => item !== id) : [...savedRoommateIds, id];
        set({ savedRoommateIds: next });
        showToast(isSaved ? 'Đã bỏ lưu bài tìm bạn' : 'Đã lưu bài tìm bạn cùng phòng ❤️', '', 'success');
        return !isSaved;
      },

      toggleSaveItem: (id) => {
        const { savedItemIds, currentUser, showToast } = get();
        if (!currentUser) {
          showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để lưu món đồ', 'warning');
          return false;
        }
        const isSaved = savedItemIds.includes(id);
        const next = isSaved ? savedItemIds.filter((item) => item !== id) : [...savedItemIds, id];
        set({ savedItemIds: next });
        showToast(isSaved ? 'Đã bỏ lưu món đồ' : 'Đã lưu món đồ thanh lý ❤️', '', 'success');
        return !isSaved;
      },

      syncSavedRooms: async (userId) => {
        try {
          const rooms = await getSavedRooms(userId);
          const ids = rooms.filter(Boolean).map((r: any) => r.id);
          set({ savedRoomIds: ids });
        } catch (err) {
          console.warn('[syncSavedRooms] Lỗi tải phòng đã lưu:', err);
        }
      },

      blockUser: async (targetUserId, targetUserName) => {
        const { blockedUserIds, showToast, currentUser } = get();
        if (!targetUserId) return;
        if (blockedUserIds.includes(targetUserId)) {
          showToast('Người dùng này đã nằm trong danh sách chặn', '', 'info');
          return;
        }

        // Cập nhật lạc quan (optimistic) trên state
        set({ blockedUserIds: [...blockedUserIds, targetUserId] });
        showToast(
          'Đã chặn liên hệ thành công',
          `Bạn và ${targetUserName || 'người dùng này'} sẽ không thể gửi tin nhắn cho nhau.`,
          'warning'
        );

        // Lưu bền vững vào Supabase
        try {
          const res = await apiBlockUser(targetUserId);
          if (!res.success && res.error) {
            console.warn('[blockUser] Lưu Supabase:', res.error);
          }
          if (currentUser?.id) {
            const list = await apiFetchBlockedUsers(currentUser.id);
            set({ blockedUsersDetailed: list });
          }
        } catch (err) {
          console.warn('[blockUser] Lỗi khi đồng bộ Supabase:', err);
        }
      },

      unblockUser: async (targetUserId) => {
        const { blockedUserIds, blockedUsersDetailed, showToast } = get();
        if (!targetUserId) return;

        set({
          blockedUserIds: blockedUserIds.filter((id) => id !== targetUserId),
          blockedUsersDetailed: blockedUsersDetailed.filter((u) => u.blocked_id !== targetUserId),
        });
        showToast('Đã bỏ chặn người dùng', 'Bạn có thể tiếp tục liên hệ bình thường.', 'success');

        try {
          await apiUnblockUser(targetUserId);
        } catch (err) {
          console.warn('[unblockUser] Lỗi khi đồng bộ Supabase:', err);
        }
      },

      isUserBlocked: (targetUserId) => {
        if (!targetUserId) return false;
        return get().blockedUserIds.includes(targetUserId);
      },

      hideItem: async (targetItemId, targetItemTitle) => {
        const { hiddenItemIds, showToast, currentUser } = get();
        if (!targetItemId) return;
        if (hiddenItemIds.includes(targetItemId)) {
          showToast('Tin này đã được ẩn khỏi danh sách của bạn', '', 'info');
          return;
        }

        // Cập nhật lạc quan (optimistic) trên state
        set({ hiddenItemIds: [...hiddenItemIds, targetItemId] });
        showToast(
          'Đã ẩn tin đăng',
          `"${targetItemTitle || 'Tin đăng'}" sẽ không còn xuất hiện trong danh sách của bạn.`,
          'info'
        );

        try {
          const res = await apiHideMarketplaceItem(targetItemId);
          if (!res.success && res.error) {
            console.warn('[hideItem] Lưu Supabase:', res.error);
          }
          if (currentUser?.id) {
            const list = await apiFetchHiddenItems(currentUser.id);
            set({ hiddenItemsDetailed: list });
          }
        } catch (err) {
          console.warn('[hideItem] Lỗi khi đồng bộ Supabase:', err);
        }
      },

      unhideItem: async (targetItemId) => {
        const { hiddenItemIds, hiddenItemsDetailed, showToast } = get();
        if (!targetItemId) return;

        set({
          hiddenItemIds: hiddenItemIds.filter((id) => id !== targetItemId),
          hiddenItemsDetailed: hiddenItemsDetailed.filter((i) => i.item_id !== targetItemId),
        });
        showToast('Đã bỏ ẩn tin đăng', 'Tin đăng sẽ xuất hiện trở lại trong danh sách.', 'success');

        try {
          await apiUnhideMarketplaceItem(targetItemId);
        } catch (err) {
          console.warn('[unhideItem] Lỗi khi đồng bộ Supabase:', err);
        }
      },

      isItemHidden: (targetItemId) => {
        if (!targetItemId) return false;
        return get().hiddenItemIds.includes(targetItemId);
      },

      syncBlocksAndHides: async (userId) => {
        if (!userId) return;
        try {
          const [blockedUsers, hiddenIds, hiddenItems] = await Promise.all([
            apiFetchBlockedUsers(userId),
            apiFetchHiddenItemIds(userId),
            apiFetchHiddenItems(userId),
          ]);

          const blockedIds = blockedUsers.map((b) => b.blocked_id);
          set({
            blockedUserIds: Array.from(new Set([...get().blockedUserIds, ...blockedIds])),
            blockedUsersDetailed: blockedUsers,
            hiddenItemIds: Array.from(new Set([...get().hiddenItemIds, ...hiddenIds])),
            hiddenItemsDetailed: hiddenItems,
          });
        } catch (err) {
          console.warn('[syncBlocksAndHides] Lỗi đồng bộ Supabase:', err);
        }
      },

      addBuilding: (data) => {
        const newId = `bld_${Date.now()}`;
        const newBuilding: Building = {
          ...data,
          id: newId,
          rating: 5.0,
          reviewCount: 0,
          verifiedBadge: false,
          geo: data.geo || { lat: 10.8, lng: 106.7 },
        };
        set((state) => ({ buildings: [newBuilding, ...state.buildings], localCreatedBuildings: [newBuilding, ...state.localCreatedBuildings] }));
        get().showToast('Tạo hồ sơ tòa nhà thành công!', 'Hồ sơ đã được gửi để kiểm duyệt', 'success');
        return newId;
      },

      removeBuilding: (id) => {
        set((state) => ({
          buildings: state.buildings.filter((b) => b.id !== id),
          localCreatedBuildings: state.localCreatedBuildings.filter((b) => b.id !== id),
        }));
        // TODO: Call API to delete building if needed
        get().showToast('Đã xóa tòa nhà', 'Tòa nhà đã được xóa khỏi hệ thống', 'success');
      },

      addRoom: (data) => {
        const newId = `room_${Date.now()}`;
        const newRoom: Room = {
          ...data,
          id: newId,
          views: 1,
          savedCount: 0,
          status: 'Chờ duyệt',
          verified: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ rooms: [newRoom, ...state.rooms], localCreatedRooms: [newRoom, ...state.localCreatedRooms] }));
        // Sync lên Supabase Cloud trong background
        syncRoomToSupabase(newRoom).catch(console.warn);
        get().showToast('Đăng phòng thành công!', 'Tin đăng đang được kiểm duyệt (trong vòng 24h)', 'success');
        return newId;
      },

      removeRoom: (id) => {
        set((state) => ({
          rooms: state.rooms.filter((r) => r.id !== id),
          localCreatedRooms: state.localCreatedRooms.filter((r) => r.id !== id),
        }));
        // TODO: Call API to delete room if needed
        get().showToast('Đã xóa phòng', 'Phòng đã được xóa khỏi hệ thống', 'success');
      },

      updateRoom: (roomId, updates) => {
        set((state) => ({
          rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, ...updates } : r)),
        }));
        get().showToast('Cập nhật phòng thành công!', 'Thông tin phòng đã được lưu lại', 'success');
      },

      updateRoomStatus: (roomId, status) => {
        set((state) => ({
          rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, status } : r)),
        }));
        get().showToast('Cập nhật trạng thái thành công', `Phòng hiện có trạng thái: ${status}`, 'success');
      },

      approveRoom: (roomId) => {
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, status: 'Còn trống', verified: true, rejectionReason: undefined } : r
          ),
          notifications: [
            {
              id: `notif_${Date.now()}`,
              userId: 'user_owner_1',
              type: 'approval',
              title: 'Tin đăng phòng đã được duyệt thành công! ✅',
              body: `Phòng ID ${roomId} đã được phê duyệt và hiển thị công khai trên ứng dụng.`,
              createdAt: new Date().toISOString(),
              read: false,
              actionLink: `/chu-tro/phong/${roomId}`,
            },
            ...state.notifications,
          ],
        }));
        get().showToast('Phê duyệt tin thành công', 'Phòng đã được chuyển sang trạng thái Còn trống', 'success');
      },

      rejectRoom: (roomId, reason) => {
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, status: 'Bị từ chối', verified: false, rejectionReason: reason } : r
          ),
          notifications: [
            {
              id: `notif_${Date.now()}`,
              userId: 'user_owner_1',
              type: 'rejected',
              title: 'Tin đăng phòng bị từ chối ⚠️',
              body: `Lý do từ chối: ${reason}. Vui lòng cập nhật lại thông tin.`,
              createdAt: new Date().toISOString(),
              read: false,
              actionLink: `/chu-tro/phong/${roomId}`,
            },
            ...state.notifications,
          ],
        }));
        get().showToast('Đã từ chối tin đăng', `Lý do: ${reason}`, 'warning');
      },

      addRoommatePost: (data) => {
        const generateUUID = () => {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
          }
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };
        const newId = data.id || generateUUID();
        const newPost: RoommatePost = {
          ...data,
          id: newId,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          roommates: [newPost, ...state.roommates.filter((r) => r.id !== newId)],
          localCreatedRoommates: [newPost, ...state.localCreatedRoommates.filter((r) => r.id !== newId)],
        }));
        // Sync lên Supabase Cloud
        import('../lib/supabaseDataService').then(({ syncRoommatePostToSupabase }) => {
          syncRoommatePostToSupabase(newPost).catch(console.warn);
        });
        return newId;
      },

      removeRoommatePost: (id) => {
        set((state) => ({
          roommates: state.roommates.filter((r) => r.id !== id),
          localCreatedRoommates: state.localCreatedRoommates.filter((r) => r.id !== id),
        }));
        
        import('../lib/api/roommates').then(({ deleteRoommatePost }) => {
          deleteRoommatePost(id).catch(console.warn);
        });

        get().showToast('Đã xóa bài viết', 'Bài viết tìm bạn cùng phòng của bạn đã được xóa thành công', 'success');
      },

      addMarketplaceItem: (data) => {
        const newId = `item_${Date.now()}`;
        const newItem: MarketplaceItem = {
          ...data,
          id: newId,
          status: 'Chờ duyệt',
          moderationStatus: 'pending',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          marketplaceItems: [newItem, ...state.marketplaceItems],
          localCreatedItems: [newItem, ...state.localCreatedItems],
          notifications: [
            {
              id: `notif_${Date.now()}`,
              userId: data.userId ?? data.seller_id ?? data.sellerId ?? '',
              type: 'system',
              title: 'Tin đăng thanh lý đang chờ duyệt ⏳',
              body: `Món đồ "${data.name}" đã được gửi và đang chờ Ban Quản Trị kiểm duyệt trước khi hiển thị công khai.`,
              createdAt: new Date().toISOString(),
              read: false,
              ctaUrl: '/cho-do-cu',
              ctaLabel: 'Xem tin đăng',
            },
            ...state.notifications,
          ],
        }));
        // Sync lên Supabase Cloud
        syncMarketplaceItemToSupabase(newItem).catch(console.warn);
        get().showToast('Đã gửi tin chờ duyệt! ⏳', 'Tin đăng sẽ được Ban Quản Trị kiểm duyệt trước khi hiển thị công khai', 'info');
        return newId;
      },

      removeMarketplaceItem: (id) => {
        set((state) => ({
          marketplaceItems: state.marketplaceItems.filter((i) => i.id !== id),
          localCreatedItems: state.localCreatedItems.filter((i) => i.id !== id),
        }));
        // TODO: Call API to delete item if needed
        get().showToast('Đã xóa bài đăng', 'Bài đăng đồ cũ đã được xóa thành công', 'success');
      },

      updateMarketplaceItem: (itemId, updates) => {
        set((state) => ({
          marketplaceItems: state.marketplaceItems.map((m) =>
            m.id === itemId ? { ...m, ...updates } : m
          ),
        }));
        get().showToast('Cập nhật món đồ thành công!', 'Thông tin sản phẩm đã được lưu lại', 'success');
      },

      approveMarketplaceItem: (itemId) => {
        set((state) => {
          const item = state.marketplaceItems.find((m) => m.id === itemId);
          return {
            marketplaceItems: state.marketplaceItems.map((m) =>
              m.id === itemId
                ? {
                    ...m,
                    status: 'Còn hàng',
                    moderationStatus: 'approved',
                    rejectionReason: undefined,
                    updatedAt: new Date().toISOString(),
                  }
                : m
            ),
            notifications: item
              ? [
                  {
                    id: `notif_${Date.now()}`,
                    userId: item.userId ?? item.seller_id ?? item.sellerId ?? '',
                    type: 'approval',
                    title: 'Tin đăng thanh lý đã được duyệt! 🎉',
                    body: `Món đồ "${item.name}" đã được kiểm duyệt và hiển thị công khai trên Chợ đồ cũ sinh viên.`,
                    createdAt: new Date().toISOString(),
                    read: false,
                    ctaUrl: `/cho-do-cu/${itemId}`,
                    ctaLabel: 'Xem tin đăng',
                  },
                  ...state.notifications,
                ]
              : state.notifications,
          };
        });
        get().showToast('Đã duyệt tin đăng thanh lý!', 'Sản phẩm đã hiển thị công khai trên Chợ đồ cũ', 'success');
      },

      rejectMarketplaceItem: (itemId, reason) => {
        set((state) => {
          const item = state.marketplaceItems.find((m) => m.id === itemId);
          return {
            marketplaceItems: state.marketplaceItems.map((m) =>
              m.id === itemId
                ? {
                    ...m,
                    status: 'Bị từ chối',
                    moderationStatus: 'rejected',
                    rejectionReason: reason,
                    updatedAt: new Date().toISOString(),
                  }
                : m
            ),
            notifications: item
              ? [
                  {
                    id: `notif_${Date.now()}`,
                    userId: item.userId ?? item.seller_id ?? item.sellerId ?? '',
                    type: 'rejected',
                    title: 'Tin đăng thanh lý bị từ chối ⚠️',
                    body: `Lý do: ${reason}. Vui lòng sửa lại thông tin và gửi duyệt lại.`,
                    createdAt: new Date().toISOString(),
                    read: false,
                    ctaUrl: '/cho-do-cu',
                    ctaLabel: 'Sửa tin đăng',
                  },
                  ...state.notifications,
                ]
              : state.notifications,
          };
        });
        get().showToast('Đã từ chối tin đăng!', `Lý do: ${reason}`, 'info');
      },

      resubmitMarketplaceItem: (itemId, updates) => {
        set((state) => {
          const item = state.marketplaceItems.find((m) => m.id === itemId);
          const updatedName = updates.name || item?.name || 'Món đồ';
          return {
            marketplaceItems: state.marketplaceItems.map((m) =>
              m.id === itemId
                ? {
                    ...m,
                    ...updates,
                    status: 'Chờ duyệt',
                    moderationStatus: 'pending',
                    rejectionReason: undefined,
                    updatedAt: new Date().toISOString(),
                  }
                : m
            ),
            notifications: item
              ? [
                  {
                    id: `notif_${Date.now()}`,
                    userId: item.userId ?? item.seller_id ?? item.sellerId ?? '',
                    type: 'system',
                    title: 'Đã gửi lại tin đăng thanh lý ⏳',
                    body: `Món đồ "${updatedName}" đã được cập nhật và gửi lại để Ban Quản Trị kiểm duyệt.`,
                    createdAt: new Date().toISOString(),
                    read: false,
                    ctaUrl: '/cho-do-cu',
                    ctaLabel: 'Xem tin đăng',
                  },
                  ...state.notifications,
                ]
              : state.notifications,
          };
        });
        get().showToast('Đã gửi lại tin chờ duyệt! ⏳', 'Ban Quản Trị sẽ xem xét lại tin đăng của bạn', 'info');
      },

      autoModerateMarketplaceItem: (itemId, ownerId) => {
        set((state) => {
          const item = state.marketplaceItems.find((m) => m.id === itemId);
          // Nếu tin đã ở trạng thái chờ duyệt rồi thì không kích hoạt lại và không gửi thông báo trùng lặp
          if (item && (item.status === 'Chờ duyệt' || item.moderationStatus === 'pending')) {
            return state;
          }

          const targetOwner = ownerId || item?.userId || '';
          return {
            marketplaceItems: state.marketplaceItems.map((m) =>
              m.id === itemId
                ? {
                    ...m,
                    status: 'Chờ duyệt',
                    moderationStatus: 'pending',
                    rejectionReason: 'Tạm ẩn để xem xét lại do nhận nhiều phản ánh vi phạm',
                    updatedAt: new Date().toISOString(),
                  }
                : m
            ),
            notifications: targetOwner
              ? [
                  {
                    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    userId: targetOwner,
                    type: 'moderation',
                    title: 'Tin đăng đang được xem xét lại',
                    body: `Tin đăng "${item?.name || 'của bạn'}" của bạn đang được xem xét lại do nhận được nhiều phản ánh từ cộng đồng và đã tạm thời được ẩn khỏi chợ.`,
                    createdAt: new Date().toISOString(),
                    read: false,
                    ctaUrl: `/cho-do-cu/${itemId}?edit=true`,
                    ctaLabel: 'Sửa tin & gửi duyệt lại',
                  },
                  ...state.notifications,
                ]
              : state.notifications,
          };
        });
      },

      createBooking: (data) => {
        const newId = `bk_${Date.now()}`;
        const newBooking: BookingRequest = {
          ...data,
          id: newId,
          status: 'Chờ chủ trọ xác nhận',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          bookings: [newBooking, ...state.bookings],
          notifications: [
            {
              id: `notif_${Date.now()}`,
              userId: data.renterId,
              type: 'booking',
              title: 'Đặt lịch xem phòng thành công 📅',
              body: `Yêu cầu xem phòng "${data.roomTitle}" vào ${data.date} (${data.timeSlot}) đã được gửi tới chủ trọ.`,
              createdAt: new Date().toISOString(),
              read: false,
              actionLink: '/toi',
            },
            ...state.notifications,
          ],
        }));
        get().showToast('Đặt lịch thành công!', 'Chủ trọ sẽ liên hệ sớm nhất để đón bạn', 'success');
        return newId;
      },

      updateBookingStatus: (bookingId, status, note) => {
        set((state) => {
          const target = state.bookings.find((b) => b.id === bookingId);
          return {
            bookings: state.bookings.map((b) =>
              b.id === bookingId ? { ...b, status, note: note || b.note } : b
            ),
            notifications: target
              ? [
                  {
                    id: `notif_${Date.now()}`,
                    userId: target.renterId,
                    type: 'booking',
                    title: `Lịch hẹn xem phòng: ${status} 📋`,
                    body: `Lịch hẹn xem phòng "${target.roomTitle}" vào ${target.date} (${target.timeSlot}) đã chuyển sang: ${status}.`,
                    createdAt: new Date().toISOString(),
                    read: false,
                    actionLink: '/toi',
                  },
                  ...state.notifications,
                ]
              : state.notifications,
          };
        });
        get().showToast('Đã cập nhật lịch hẹn!', `Trạng thái: ${status}`, 'success');
      },

      addReport: (data) => {
        const newId = `rep_${Date.now()}`;
        const newReport: ReportItem = {
          ...data,
          id: newId,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          reports: [newReport, ...state.reports],
        }));
        get().showToast('Đã gửi báo cáo vi phạm!', 'Ban quản trị sẽ kiểm tra và đối chiếu thực tế.', 'success');
        return newId;
      },

      resolveReport: (reportId, action) => {
        set((state) => {
          const report = state.reports.find((r) => r.id === reportId);
          if (action === 'hide_listing' && report) {
            let nextRooms = state.rooms;
            let nextRoommates = state.roommates;
            let nextMarketplace = state.marketplaceItems;

            if (report.targetType === 'room') {
              nextRooms = state.rooms.map((room) =>
                room.id === report.targetId ? { ...room, status: 'Bị từ chối' as const } : room
              );
            } else if (report.targetType === 'roommate') {
              nextRoommates = state.roommates.filter((rm) => rm.id !== report.targetId);
            } else if (report.targetType === 'marketplace') {
              nextMarketplace = state.marketplaceItems.map((item) =>
                item.id === report.targetId ? { ...item, status: 'Bị từ chối' as const } : item
              );
            }

            return {
              reports: state.reports.map((r) => (r.id === reportId ? { ...r, status: 'resolved' as const } : r)),
              rooms: nextRooms,
              roommates: nextRoommates,
              marketplaceItems: nextMarketplace,
            };
          }
          return {
            reports: state.reports.map((r) =>
              r.id === reportId ? { ...r, status: action === 'hide_listing' ? 'resolved' as const : 'dismissed' as const } : r
            ),
          };
        });
        get().showToast(
          action === 'hide_listing' ? 'Đã hạ nội dung vi phạm!' : 'Đã bỏ qua báo cáo',
          '',
          action === 'hide_listing' ? 'warning' : 'info'
        );
      },

      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
        if (isSupabaseConfigured && !id.startsWith('notif_')) {
          supabase.from('notifications').update({ is_read: true }).eq('id', id).then();
        }
      },

      markAllNotificationsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
        const currentUser = get().currentUser;
        if (isSupabaseConfigured && currentUser) {
          resolveUserIdToUuid(currentUser.id).then((cleanId) => {
            if (cleanId) supabase.from('notifications').update({ is_read: true }).eq('user_id', cleanId).eq('is_read', false).then();
          });
        }
        get().showToast('Đã đánh dấu đọc tất cả thông báo', '', 'info');
      },

      showToast: (title, description, type = 'info') => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        set((state) => ({
          toasts: [...state.toasts, { id, title, description, type }],
        }));
        setTimeout(() => {
          get().removeToast(id);
        }, 3500);
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },

      fetchInitialCloudData: async () => {
        try {
          const [cloudRooms, cloudBuildings, cloudRoommates, cloudItems] = await Promise.all([
            fetchRoomsFromSupabase(),
            fetchBuildingsFromSupabase(),
            fetchRoommatesFromSupabase(),
            fetchMarketplaceItemsFromSupabase(),
          ]);

          set((state) => {
            const existingUserPosts = state.roommates.filter(
              (r) =>
                !cloudRoommates.some((cr) => cr.id === r.id) &&
                (r.id.startsWith('rm_') || (state.currentUser?.id && r.userId === state.currentUser.id))
            );

            // Gộp dữ liệu cloud với dữ liệu được tạo tại client nhưng chưa/không tải được từ cloud (vd: lỗi RLS demo user)
            const localRooms = state.localCreatedRooms || [];
            const mergedRooms = [
              ...localRooms.filter((lr) => !cloudRooms.some((cr) => cr.id === lr.id)),
              ...cloudRooms,
            ];

            const localBuildings = state.localCreatedBuildings || [];
            const mergedBuildings = [
              ...localBuildings.filter((lb) => !cloudBuildings.some((cb) => cb.id === lb.id)),
              ...cloudBuildings,
            ];

            const localRoommates = state.localCreatedRoommates || [];
            const mergedRoommates = [
              ...existingUserPosts,
              ...localRoommates.filter((lr) => !cloudRoommates.some((cr) => cr.id === lr.id) && !existingUserPosts.some((er) => er.id === lr.id)),
              ...cloudRoommates,
            ];

            const localItems = state.localCreatedItems || [];
            const mergedItems = [
              ...localItems.filter((li) => !cloudItems.some((ci) => ci.id === li.id)),
              ...cloudItems,
            ];

            return {
              rooms: mergedRooms.length > 0 ? mergedRooms : (isDev ? state.rooms : []),
              buildings: mergedBuildings.length > 0 ? mergedBuildings : (isDev ? state.buildings : []),
              roommates: mergedRoommates,
              marketplaceItems: mergedItems.length > 0 ? mergedItems : (isDev ? state.marketplaceItems : []),
            };
          });
        } catch (err) {
          console.warn('[useAppStore] Không thể tải dữ liệu cloud:', err);
          if (!isDev) {
            // Không che lỗi API bằng mock data ở production
            set({
              rooms: [],
              buildings: [],
              roommates: [],
              marketplaceItems: [],
            });
          }
        }
      },

      resetAllData: () => {
        set({
          currentUser: initialUsers[0],
          ownerApplications: initialOwnerApplications,
          rooms: initialRooms,
          buildings: initialBuildings,
          roommates: initialRoommates,
          marketplaceItems: initialMarketplaceItems,
          notifications: initialNotifications,
          savedRoomIds: ['room_1', 'room_2'],
          savedRoommateIds: ['rm_1'],
          savedItemIds: ['item_1'],
          bookings: [],
          toasts: [],
        });
        get().showToast('Đã khôi phục toàn bộ dữ liệu ban đầu', 'Hệ thống đã sẵn sàng kiểm thử!', 'success');
      },
    }),
    {
      name: 'troxinh_storage_v4',
      onRehydrateStorage: () => (state) => {
        if (state?.currentUser) {
          const email = state.currentUser.email?.toLowerCase();
          if (email === 'quan66934@gmail.com' || email === 'admin@troxinh.vn') {
            state.currentUser.role = 'admin';
          }
        }
      },
      partialize: (state) => ({
        currentUser: state.currentUser,
        savedRoomIds: state.savedRoomIds,
        savedRoommateIds: state.savedRoommateIds,
        savedItemIds: state.savedItemIds,
        blockedUserIds: state.blockedUserIds,
        hiddenItemIds: state.hiddenItemIds,
        bookings: state.bookings,
        ownerSubscription: state.ownerSubscription,
        localCreatedRooms: state.localCreatedRooms,
        localCreatedBuildings: state.localCreatedBuildings,
        localCreatedRoommates: state.localCreatedRoommates,
        localCreatedItems: state.localCreatedItems,
      }),
    }
  )
);

// Đăng ký listener tự động kiểm duyệt tin đăng khi có báo cáo đủ ngưỡng
onAutoModerationTriggered(({ targetId, targetOwnerId }) => {
  useAppStore.getState().autoModerateMarketplaceItem(targetId, targetOwnerId);
});
