import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { ToastContainer } from './components/ui/ToastContainer';
import { PushPermissionToast } from './components/ui/PushPermissionToast';
import { useAppStore } from './store/useAppStore';
import { Button } from './components/ui/Button';
import { Building2, ArrowRight, ShieldAlert, Home } from 'lucide-react';
import { BackToTopButton } from './components/common/BackToTopButton';
import { OfflineBanner } from './components/common/OfflineBanner';
import { AuthModal } from './components/modals/AuthModal';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute';

// Lazy Loaded Pages
const LandingPage = React.lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const SearchPage = React.lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const MapViewPage = React.lazy(() => import('./pages/MapViewPage').then((m) => ({ default: m.MapViewPage })));
const RoomDetailPage = React.lazy(() => import('./pages/RoomDetailPage').then((m) => ({ default: m.RoomDetailPage })));
const BuildingDetailPage = React.lazy(() => import('./pages/BuildingDetailPage').then((m) => ({ default: m.BuildingDetailPage })));
const RoommateListPage = React.lazy(() => import('./pages/RoommateListPage').then((m) => ({ default: m.RoommateListPage })));
const RoommateDetailPage = React.lazy(() => import('./pages/RoommateDetailPage').then((m) => ({ default: m.RoommateDetailPage })));
const MarketplaceListPage = React.lazy(() => import('./pages/MarketplaceListPage').then((m) => ({ default: m.MarketplaceListPage })));
const MarketplaceDetailPage = React.lazy(() => import('./pages/MarketplaceDetailPage').then((m) => ({ default: m.MarketplaceDetailPage })));
const TrustVerificationPage = React.lazy(() => import('./pages/TrustVerificationPage').then((m) => ({ default: m.TrustVerificationPage })));
const ContractTemplatePage = React.lazy(() => import('./pages/ContractTemplatePage').then((m) => ({ default: m.ContractTemplatePage })));
const DepositContractPage = React.lazy(() => import('./pages/DepositContractPage').then((m) => ({ default: m.DepositContractPage })));
const TermsPage = React.lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })));
const HelpPage = React.lazy(() => import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })));

// Auth Pages
const LoginPage = React.lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const OtpVerificationPage = React.lazy(() => import('./pages/OtpVerificationPage').then((m) => ({ default: m.OtpVerificationPage })));

// Renter Pages & Owner Upgrade
const RenterOnboardingPage = React.lazy(() => import('./pages/RenterOnboardingPage').then((m) => ({ default: m.RenterOnboardingPage })));
const RenterProfilePage = React.lazy(() => import('./pages/RenterProfilePage').then((m) => ({ default: m.RenterProfilePage })));
const UserPostsPage = React.lazy(() => import('./pages/UserPostsPage').then((m) => ({ default: m.UserPostsPage })));
const SavedRoomsPage = React.lazy(() => import('./pages/SavedRoomsPage').then((m) => ({ default: m.SavedRoomsPage })));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const ChatPage = React.lazy(() => import('./pages/ChatPage').then((m) => ({ default: m.ChatPage })));
const BookingPage = React.lazy(() => import('./pages/BookingPage').then((m) => ({ default: m.BookingPage })));
const OwnerUpgradePage = React.lazy(() => import('./pages/OwnerUpgradePage').then((m) => ({ default: m.OwnerUpgradePage })));
const OwnerApplicationStatusPage = React.lazy(() => import('./pages/OwnerApplicationStatusPage').then((m) => ({ default: m.OwnerApplicationStatusPage })));

// Pricing & Payments
const PricingPage = React.lazy(() => import('./pages/PricingPage').then((m) => ({ default: m.PricingPage })));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const PaymentResultPage = React.lazy(() => import('./pages/PaymentResultPage').then((m) => ({ default: m.PaymentResultPage })));

// Owner Pages
const OwnerOnboardingPage = React.lazy(() => import('./pages/OwnerOnboardingPage').then((m) => ({ default: m.OwnerOnboardingPage })));
const OwnerDashboardPage = React.lazy(() => import('./pages/OwnerDashboardPage').then((m) => ({ default: m.OwnerDashboardPage })));
const OwnerBuildingListPage = React.lazy(() => import('./pages/OwnerBuildingListPage').then((m) => ({ default: m.OwnerBuildingListPage })));
const OwnerCreateBuildingPage = React.lazy(() => import('./pages/OwnerCreateBuildingPage').then((m) => ({ default: m.OwnerCreateBuildingPage })));
const OwnerCreateRoomPage = React.lazy(() => import('./pages/OwnerCreateRoomPage').then((m) => ({ default: m.OwnerCreateRoomPage })));
const OwnerRoomDetailPage = React.lazy(() => import('./pages/OwnerRoomDetailPage').then((m) => ({ default: m.OwnerRoomDetailPage })));
const OwnerBoostRoomPage = React.lazy(() => import('./pages/OwnerBoostRoomPage').then((m) => ({ default: m.OwnerBoostRoomPage })));
const OwnerSubscriptionManagePage = React.lazy(() => import('./pages/OwnerSubscriptionManagePage').then((m) => ({ default: m.OwnerSubscriptionManagePage })));
const OwnerProfilePage = React.lazy(() => import('./pages/OwnerProfilePage').then((m) => ({ default: m.OwnerProfilePage })));

// Admin Pages
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminReportsPage = React.lazy(() => import('./pages/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })));
const AdminModerationPage = React.lazy(() => import('./pages/AdminModerationPage').then((m) => ({ default: m.AdminModerationPage })));
const AdminOwnerApplicationsPage = React.lazy(() => import('./pages/AdminOwnerApplicationsPage').then((m) => ({ default: m.AdminOwnerApplicationsPage })));
const AdminUsersPage = React.lazy(() => import('./pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminBookingsPage = React.lazy(() => import('./pages/AdminBookingsPage').then((m) => ({ default: m.AdminBookingsPage })));
const AdminAuditLogsPage = React.lazy(() => import('./pages/AdminAuditLogsPage').then((m) => ({ default: m.AdminAuditLogsPage })));
const AdminSystemHealthPage = React.lazy(() => import('./pages/AdminSystemHealthPage').then((m) => ({ default: m.AdminSystemHealthPage })));
const AdminFinancePage = React.lazy(() => import('./pages/AdminFinancePage').then((m) => ({ default: m.AdminFinancePage })));
const AdminAnalyticsPage = React.lazy(() => import('./pages/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })));

// QA & 404
const DebugPage = React.lazy(() => import('./pages/DebugPage').then((m) => ({ default: m.DebugPage })));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

// Page Loading Skeleton Fallback
const PageSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
    <div className="h-8 bg-gray-200 rounded-2xl w-1/3" />
    <div className="h-4 bg-gray-200 rounded-xl w-1/2" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
      <div className="h-72 bg-gray-200/70 rounded-3xl" />
      <div className="h-72 bg-gray-200/70 rounded-3xl" />
      <div className="h-72 bg-gray-200/70 rounded-3xl" />
    </div>
  </div>
);

import { useCloseOnNavigate } from './hooks/useCloseOnNavigate';
import { auth, onAuthStateChanged, onIdTokenChanged } from './lib/firebase';
import { getProfileByFirebaseUid, syncFirebaseUserToSupabase } from './lib/authService';
import { setAnalyticsUser } from './lib/analytics';

// Global Firebase Auth & Cloud Data Loader
const AppCloudDataLoader: React.FC = () => {
  const { loginWithSocialUser, logout, currentUser, fetchInitialCloudData } = useAppStore();

  // Đồng bộ định danh và vai trò người dùng (Admin, Chủ trọ, Người thuê) lên GA4
  React.useEffect(() => {
    setAnalyticsUser(currentUser ? { id: currentUser.id, role: currentUser.role, email: currentUser.email } : null);
  }, [currentUser]);

  React.useEffect(() => {
    // 1. Tải dữ liệu từ Supabase Cloud khi mở web
    fetchInitialCloudData();

    // 2. Lắng nghe trạng thái đăng nhập Firebase Auth duy nhất
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const email = fbUser.email?.toLowerCase();
          const isSuperAdmin = email === 'quan66934@gmail.com' || email === 'admin@troxinh.vn';
          const profile = await getProfileByFirebaseUid(fbUser.uid);
          if (profile) {
            loginWithSocialUser({
              id: profile.id,
              name: isSuperAdmin ? 'Quản Trị Viên (Quân)' : profile.name,
              email: profile.email || fbUser.email || undefined,
              phone: profile.phone || fbUser.phoneNumber || undefined,
              role: isSuperAdmin ? 'admin' : profile.role,
              avatarUrl: profile.avatarUrl || fbUser.photoURL || undefined,
              emailVerified: fbUser.emailVerified,
              phoneVerified: !!fbUser.phoneNumber,
            });
          } else {
            const synced = await syncFirebaseUserToSupabase(fbUser);
            loginWithSocialUser({
              id: synced.id,
              name: isSuperAdmin ? 'Quản Trị Viên (Quân)' : synced.name,
              email: synced.email || fbUser.email || undefined,
              phone: synced.phone || fbUser.phoneNumber || undefined,
              role: isSuperAdmin ? 'admin' : synced.role,
              avatarUrl: synced.avatarUrl || fbUser.photoURL || undefined,
              emailVerified: fbUser.emailVerified,
              phoneVerified: !!fbUser.phoneNumber,
            });
          }
        } catch (err) {
          console.warn('[Auth] Lỗi đồng bộ profile Firebase:', err);
        }
        // Tải lại chợ đồ cũ bằng phiên Firebase để người bán thấy cả tin chờ duyệt của mình
        useAppStore.getState().refreshMarketplaceItems();
      } else {
        // Nếu không có Firebase user và không phải tài khoản demo đang đăng nhập
        if (currentUser && !currentUser.isDemoAccount && !currentUser.id.startsWith('demo_')) {
          // logout();
        }
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, [fetchInitialCloudData, loginWithSocialUser]);

  return null;
};

// Route change handler: auto-closes panels/dropdowns/sheets & resets scroll
const RouteNavigationHandler = () => {
  useCloseOnNavigate();
  return null;
};

// Route Guard for Owner SaaS Routes (with edge-case pending redirect)
const OwnerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAppStore();

  if (!currentUser) {
    return <Navigate to="/dang-nhap?returnUrl=/chu-tro" replace />;
  }

  if (currentUser.role !== 'owner') {
    if (currentUser.ownerApplicationStatus === 'pending') {
      return <Navigate to="/landlord-registration/trang-thai" replace />;
    }

    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-3xl border border-amber-200 text-center space-y-6 shadow-md animate-fadeIn">
        <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-gray-900">Yêu Cầu Quyền Chủ Trọ</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Khu vực này dành riêng cho Đối Tác Chủ Trọ TroXinh. Bạn có thể nộp hồ sơ để được thẩm định và cấp quyền đăng phòng miễn phí.
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => (window.location.href = '/landlord-registration')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Nộp Hồ Sơ Nâng Cấp Ngay (24h)
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Route Guard for Admin Routes
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAppStore();
  const location = useLocation();

  if (!currentUser) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/dang-nhap?returnUrl=${returnUrl}`} replace />;
  }

  const isAdmin =
    currentUser.app_role === 'admin' ||
    currentUser.appRole === 'admin' ||
    currentUser.role === 'admin' ||
    (currentUser as any).admin_role === 'superadmin' ||
    (currentUser as any).admin_role === 'super_admin';

  if (!isAdmin) {
    return (
      <div className="flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-gray-50">
        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-gray-900">Không có quyền truy cập</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Tài khoản của bạn ({currentUser.email || currentUser.name}) không có quyền quản trị viên để truy cập khu vực này.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="w-full">
              <Button variant="outline" size="sm" className="w-full text-xs">
                <Home className="w-4 h-4 mr-1.5" />
                Về Trang chủ
              </Button>
            </Link>
            <Link
              to={`/dang-nhap?returnUrl=${encodeURIComponent(location.pathname + location.search)}`}
              className="w-full"
            >
              <Button variant="primary" size="sm" className="w-full text-xs">
                Đổi tài khoản khác
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <RouteNavigationHandler />
      <AppCloudDataLoader />
      <div className="flex flex-col min-h-screen">
        <Navbar />

        <div className="flex-1">
          <React.Suspense fallback={<PageSkeleton />}>
            <Routes>
              {/* Public Core Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/tim-kiem" element={<SearchPage />} />
              <Route path="/tim-phong" element={<SearchPage />} />
              <Route path="/ban-do" element={<MapViewPage />} />
              <Route path="/phong/:id" element={<RoomDetailPage />} />
              <Route path="/toa-nha/:id" element={<BuildingDetailPage />} />

            {/* Roommate & Marketplace */}
            <Route path="/roommate" element={<RoommateListPage />} />
            <Route path="/roommate/:id" element={<RoommateDetailPage />} />
            <Route path="/tim-ban-cung-phong" element={<RoommateListPage />} />
            <Route path="/tim-ban-cung-phong/:id" element={<RoommateDetailPage />} />
            <Route path="/cho-do-cu" element={<MarketplaceListPage />} />
            <Route path="/cho-do-cu/:id" element={<MarketplaceDetailPage />} />
            <Route path="/ve-chung-toi/kiem-duyet" element={<TrustVerificationPage />} />
            <Route path="/trust/da-kiem-duyet" element={<TrustVerificationPage />} />
            <Route path="/hop-dong-mau" element={<ContractTemplatePage />} />
            <Route path="/bien-ban-dat-coc" element={<DepositContractPage />} />
            <Route path="/dieu-khoan" element={<TermsPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/chinh-sach-bao-mat" element={<PrivacyPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/tro-giup" element={<HelpPage />} />
            <Route path="/help-center" element={<HelpPage />} />

            {/* Auth Flow */}
            <Route
              path="/dang-nhap"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/dang-ky"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/quen-mat-khau"
              element={
                <PublicOnlyRoute>
                  <ForgotPasswordPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/xac-thuc-otp" element={<OtpVerificationPage />} />

            {/* Pricing & Checkout Routes */}
            <Route path="/nang-cap" element={<PricingPage />} />
            <Route path="/bang-gia" element={<PricingPage />} />
            <Route path="/thanh-toan/:planId" element={<CheckoutPage />} />
            <Route path="/thanh-toan/ket-qua" element={<PaymentResultPage />} />

            {/* Renter Features & Upgrade */}
            <Route path="/onboarding" element={<RenterOnboardingPage />} />
            <Route path="/onboarding/nguoi-thue" element={<RenterOnboardingPage />} />
            <Route
              path="/toi"
              element={
                <ProtectedRoute>
                  <RenterProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ho-so"
              element={
                <ProtectedRoute>
                  <RenterProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <RenterProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute>
                  <RenterProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ho-so/chinh-sua"
              element={
                <ProtectedRoute>
                  <RenterProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/vouchers" element={<Navigate to="/ve-chung-toi" replace />} />
            <Route path="/offers" element={<Navigate to="/ve-chung-toi" replace />} />
            <Route path="/uu-dai" element={<Navigate to="/ve-chung-toi" replace />} />
            <Route path="/kho-voucher" element={<Navigate to="/ve-chung-toi" replace />} />

            <Route
              path="/da-luu"
              element={
                <ProtectedRoute>
                  <SavedRoomsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/saved-items"
              element={
                <ProtectedRoute>
                  <SavedRoomsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quan-ly-bai-viet"
              element={
                <ProtectedRoute>
                  <UserPostsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/thong-bao"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tin-nhan"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tin-nhan/:conversationId"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dat-lich/:roomId"
              element={
                <ProtectedRoute>
                  <BookingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lich-hen"
              element={
                <ProtectedRoute>
                  <BookingPage />
                </ProtectedRoute>
              }
            />
            <Route path="/landlord-registration" element={<OwnerUpgradePage />} />
            <Route path="/landlord-registration/trang-thai" element={<OwnerApplicationStatusPage />} />
            <Route path="/landlord-registration/status" element={<OwnerApplicationStatusPage />} />
            <Route path="/nang-cap-chu-tro" element={<OwnerUpgradePage />} />
            <Route path="/nang-cap-chu-tro/trang-thai" element={<OwnerApplicationStatusPage />} />

            {/* Owner SaaS Features (Protected) */}
            <Route
              path="/chu-tro/onboarding"
              element={
                <OwnerRoute>
                  <OwnerOnboardingPage />
                </OwnerRoute>
              }
            />
            <Route
              path="/chu-tro"
              element={
                <OwnerRoute>
                  <OwnerDashboardPage />
                </OwnerRoute>
              }
            />
            <Route
              path="/chu-tro/tong-quan"
              element={
                <OwnerRoute>
                  <OwnerDashboardPage />
                </OwnerRoute>
              }
            />
            <Route
              path="/chu-tro/toa-nha"
              element={
                <OwnerRoute>
                  <OwnerBuildingListPage />
                </OwnerRoute>
              }
            />
            <Route
              path="/chu-tro/toa-nha/tao-moi"
              element={
                <OwnerRoute>
                  <OwnerCreateBuildingPage />
                </OwnerRoute>
              }
            />
            <Route
              path="/chu-tro/toa-nha/:id"
              element={
                <OwnerRoute>
                  <BuildingDetailPage />
                </OwnerRoute>
              }
            />
            <Route
              path="/chu-tro/phong/tao-moi"
              element={
                <OwnerRoute>
                  <OwnerCreateRoomPage />
                </OwnerRoute>
              }
            />
            <Route
              path="/chu-tro/phong/tao-moi/:buildingId"
              element={
                <OwnerRoute>
                  <OwnerCreateRoomPage />
                </OwnerRoute>
              }
            />
            <Route
              path="/chu-tro/phong/:id"
              element={
                <OwnerRoute>
                  <OwnerRoomDetailPage />
                </OwnerRoute>
              }
            />
            <Route
              path="/chu-tro/phong/chinh-sua/:id"
              element={
                <OwnerRoute>
                  <OwnerCreateRoomPage />
                </OwnerRoute>
              }
            />
            <Route path="/chu-tro/tin-nhan" element={<Navigate to="/tin-nhan" replace />} />
            <Route path="/chu-tro/lich-hen" element={<Navigate to="/lich-hen" replace />} />
            <Route
              path="/chu-tro/thong-bao"
              element={
                <OwnerRoute>
                  <NotificationsPage />
                </OwnerRoute>
              }
            />
            <Route
              path="/chu-tro/nang-cap-tin/:roomId"
              element={
                <OwnerRoute>
                  <OwnerBoostRoomPage />
                </OwnerRoute>
              }
            />
            <Route
              path="/chu-tro/quan-ly-goi"
              element={
                <OwnerRoute>
                  <OwnerSubscriptionManagePage />
                </OwnerRoute>
              }
            />
            <Route
              path="/chu-tro/toi"
              element={
                <OwnerRoute>
                  <OwnerProfilePage />
                </OwnerRoute>
              }
            />

            {/* Admin Features (Protected) */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/bao-cao"
              element={
                <AdminRoute>
                  <AdminReportsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AdminRoute>
                  <AdminReportsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/kiem-duyet"
              element={
                <AdminRoute>
                  <AdminModerationPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/kiem-duyet/*"
              element={
                <AdminRoute>
                  <AdminModerationPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/don-chu-tro"
              element={
                <AdminRoute>
                  <AdminOwnerApplicationsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/nguoi-dung"
              element={
                <AdminRoute>
                  <AdminUsersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/lich-hen"
              element={
                <AdminRoute>
                  <AdminBookingsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/nhat-ky"
              element={
                <AdminRoute>
                  <AdminAuditLogsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/he-thong"
              element={
                <AdminRoute>
                  <AdminSystemHealthPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/thong-ke"
              element={
                <AdminRoute>
                  <AdminAnalyticsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/tai-chinh"
              element={
                <AdminRoute>
                  <AdminFinancePage />
                </AdminRoute>
              }
            />

            {/* Debug QA Tool */}
            <Route path="/debug" element={<DebugPage />} />

            {/* 404 Not Found */}
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </React.Suspense>
      </div>

        <Footer />
        <MobileBottomNav />
        <BackToTopButton />
        <OfflineBanner />
        <PushPermissionToast />
        <ToastContainer />
        <AuthModal />
      </div>
    </BrowserRouter>
  );
};

export default App;
