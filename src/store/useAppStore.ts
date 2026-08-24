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
  Thread,
  Message,
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
  initialThreads,
  initialMessages,
} from '../data/mockData';
import { signOut } from '../lib/api/auth';

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
  threads: Thread[];
  messages: Message[];
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
  loginWithPhone: (phone: string, roleHint?: UserRole) => boolean;
  registerUser: (data: { name: string; phone: string }) => User;
  logout: () => void;

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

  // Room & Building management
  addBuilding: (building: Omit<Building, 'id'>) => string;
  addRoom: (room: Omit<Room, 'id' | 'views' | 'savedCount' | 'createdAt'>) => string;
  updateRoomStatus: (roomId: string, status: Room['status']) => void;
  approveRoom: (roomId: string) => void;
  rejectRoom: (roomId: string, reason: string) => void;

  // Community & Marketplace
  addRoommatePost: (post: Omit<RoommatePost, 'id' | 'createdAt'>) => string;
  addMarketplaceItem: (item: Omit<MarketplaceItem, 'id' | 'createdAt'>) => string;

  // Bookings
  createBooking: (booking: Omit<BookingRequest, 'id' | 'createdAt' | 'status'>) => string;
  updateBookingStatus: (bookingId: string, status: BookingRequest['status'], note?: string) => void;

  // Reports
  addReport: (report: Omit<ReportItem, 'id' | 'createdAt' | 'status'>) => string;
  resolveReport: (reportId: string, action: 'hide_listing' | 'dismiss') => void;

  // Messages
  sendMessage: (threadId: string, text: string) => void;
  getOrCreateThread: (contactId: string, roomId?: string) => string;

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Toast
  showToast: (title: string, description?: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  // Debug & Reset
  resetAllData: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null, // Default guest unauthenticated state
      ownerApplications: initialOwnerApplications,
      rooms: initialRooms,
      buildings: initialBuildings,
      roommates: initialRoommates,
      marketplaceItems: initialMarketplaceItems,
      notifications: initialNotifications,
      threads: initialThreads,
      messages: initialMessages,
      savedRoomIds: [],
      savedRoommateIds: [],
      savedItemIds: [],
      bookings: [],
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

      setCurrentUser: (user) => set({ currentUser: user }),

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

      loginWithPhone: (phone, roleHint) => {
        const found = initialUsers.find((u) => u.phone === phone);
        if (found) {
          set({ currentUser: found });
          get().showToast(`Đăng nhập thành công`, `Chào mừng trở lại, ${found.name}!`, 'success');
          return true;
        }
        // If not found in seed, create or log in as normal user
        const targetRole: 'user' | 'owner' | 'admin' = roleHint === 'owner' ? 'owner' : roleHint === 'admin' ? 'admin' : 'user';
        const newUser: User = {
          id: `user_${Date.now()}`,
          name: 'Người Dùng Mới',
          phone,
          role: targetRole,
          avatarUrl: '/images/user-avatar.jpg',
          verified: true,
          ownerApplicationStatus: targetRole === 'owner' ? 'approved' : 'none',
          createdAt: new Date().toISOString(),
        };
        set({ currentUser: newUser });
        get().showToast(`Đăng nhập thành công`, `Chào mừng bạn đến với Trọ Xinh!`, 'success');
        return true;
      },

      registerUser: ({ name, phone }) => {
        const newUser: User = {
          id: `user_${Date.now()}`,
          name,
          phone,
          role: 'user', // Always standard user after registration
          avatarUrl: '/images/user-avatar.jpg',
          verified: true,
          ownerApplicationStatus: 'none',
          createdAt: new Date().toISOString(),
        };
        set({ currentUser: newUser });
        get().showToast(
          'Đăng ký tài khoản thành công! 🎉',
          `Chào mừng ${name} gia nhập cộng đồng Trọ Xinh.`,
          'success'
        );
        return newUser;
      },

      logout: () => {
        signOut().catch(() => {});
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
        set((state) => ({ buildings: [newBuilding, ...state.buildings] }));
        get().showToast('Tạo hồ sơ tòa nhà thành công!', 'Hồ sơ đã được gửi để kiểm duyệt', 'success');
        return newId;
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
        set((state) => ({ rooms: [newRoom, ...state.rooms] }));
        get().showToast('Đăng phòng thành công!', 'Tin đăng đang được kiểm duyệt (trong vòng 24h)', 'success');
        return newId;
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
              actionLink: `/phong/${roomId}`,
            },
            ...state.notifications,
          ],
        }));
        get().showToast('Đã phê duyệt tin đăng!', 'Tin đăng đã được xuất bản công khai', 'success');
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
              title: 'Tin đăng phòng bị từ chối ❌',
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
        const newId = `rm_${Date.now()}`;
        const newPost: RoommatePost = {
          ...data,
          id: newId,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ roommates: [newPost, ...state.roommates] }));
        get().showToast('Đăng tin tìm bạn thành công!', 'Bài viết của bạn đã được hiển thị', 'success');
        return newId;
      },

      addMarketplaceItem: (data) => {
        const newId = `item_${Date.now()}`;
        const newItem: MarketplaceItem = {
          ...data,
          id: newId,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ marketplaceItems: [newItem, ...state.marketplaceItems] }));
        get().showToast('Đăng món đồ thành công!', 'Sản phẩm đã xuất hiện trên chợ đồ cũ', 'success');
        return newId;
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
          if (action === 'hide_listing' && report && report.targetType === 'room') {
            return {
              reports: state.reports.map((r) => (r.id === reportId ? { ...r, status: 'resolved' as const } : r)),
              rooms: state.rooms.map((room) => (room.id === report.targetId ? { ...room, status: 'Bị từ chối' as const } : room)),
            };
          }
          return {
            reports: state.reports.map((r) => (r.id === reportId ? { ...r, status: action === 'hide_listing' ? 'resolved' as const : 'dismissed' as const } : r)),
          };
        });
        get().showToast(
          action === 'hide_listing' ? 'Đã hạ tin đăng vi phạm!' : 'Đã bỏ qua báo cáo',
          '',
          action === 'hide_listing' ? 'warning' : 'info'
        );
      },

      sendMessage: (threadId, text) => {
        const { currentUser } = get();
        const newMsgId = `msg_${Date.now()}`;
        const newMsg: Message = {
          id: newMsgId,
          threadId,
          senderId: currentUser?.id || 'user_guest',
          senderName: currentUser?.name || 'Khách',
          senderAvatar: currentUser?.avatarUrl || '/images/user-avatar.jpg',
          text,
          createdAt: new Date().toISOString(),
          status: 'sent',
        };

        set((state) => ({
          messages: [...state.messages, newMsg],
          threads: state.threads.map((t) =>
            t.id === threadId ? { ...t, lastMessage: text, lastMessageAt: new Date().toISOString() } : t
          ),
        }));
      },

      getOrCreateThread: (contactId, roomId) => {
        const { threads, currentUser, rooms } = get();
        const existing = threads.find((t) =>
          t.participants.some((p) => p.id === contactId) && (!roomId || t.relatedRoomId === roomId)
        );
        if (existing) return existing.id;

        const contactUser = initialUsers.find((u) => u.id === contactId) || {
          id: contactId,
          name: 'Chủ Trọ',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          role: 'owner' as const,
        };

        const relatedRoom = roomId ? rooms.find((r) => r.id === roomId) : undefined;
        const newThreadId = `th_${Date.now()}`;

        const newThread: Thread = {
          id: newThreadId,
          participants: [
            {
              id: currentUser?.id || 'guest',
              name: currentUser?.name || 'Tôi',
              avatar: currentUser?.avatarUrl || '/images/user-avatar.jpg',
              role: currentUser?.role || 'user',
            },
            {
              id: contactUser.id,
              name: contactUser.name,
              avatar: contactUser.avatarUrl,
              role: 'owner',
            },
          ],
          relatedRoomId: roomId,
          relatedRoomTitle: relatedRoom?.title,
          lastMessage: 'Bắt đầu cuộc trò chuyện...',
          lastMessageAt: new Date().toISOString(),
          unreadCount: 0,
        };

        set((state) => ({ threads: [newThread, ...state.threads] }));
        return newThreadId;
      },

      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
      },

      markAllNotificationsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
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

      resetAllData: () => {
        set({
          currentUser: initialUsers[0],
          ownerApplications: initialOwnerApplications,
          rooms: initialRooms,
          buildings: initialBuildings,
          roommates: initialRoommates,
          marketplaceItems: initialMarketplaceItems,
          notifications: initialNotifications,
          threads: initialThreads,
          messages: initialMessages,
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
      name: 'troxinh_storage_v2',
    }
  )
);
