import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { ToastContainer } from './components/ui/ToastContainer';
import { useAppStore } from './store/useAppStore';
import { Button } from './components/ui/Button';
import { Building2, ArrowRight } from 'lucide-react';

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

// Auth Pages
const LoginPage = React.lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const OtpVerificationPage = React.lazy(() => import('./pages/OtpVerificationPage').then((m) => ({ default: m.OtpVerificationPage })));

// Renter Pages & Owner Upgrade
const RenterOnboardingPage = React.lazy(() => import('./pages/RenterOnboardingPage').then((m) => ({ default: m.RenterOnboardingPage })));
const RenterProfilePage = React.lazy(() => import('./pages/RenterProfilePage').then((m) => ({ default: m.RenterProfilePage })));
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
const AdminModerationPage = React.lazy(() => import('./pages/AdminModerationPage').then((m) => ({ default: m.AdminModerationPage })));
const AdminOwnerApplicationsPage = React.lazy(() => import('./pages/AdminOwnerApplicationsPage').then((m) => ({ default: m.AdminOwnerApplicationsPage })));
const AdminUsersPage = React.lazy(() => import('./pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
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

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
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
      return <Navigate to="/nang-cap-chu-tro/trang-thai" replace />;
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
            onClick={() => (window.location.href = '/nang-cap-chu-tro')}
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

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/dang-nhap?returnUrl=/admin" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
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

            {/* Auth Flow */}
            <Route path="/dang-nhap" element={<LoginPage />} />
            <Route path="/dang-ky" element={<RegisterPage />} />
            <Route path="/quen-mat-khau" element={<ForgotPasswordPage />} />
            <Route path="/xac-thuc-otp" element={<OtpVerificationPage />} />

            {/* Pricing & Checkout Routes */}
            <Route path="/nang-cap" element={<PricingPage />} />
            <Route path="/bang-gia" element={<PricingPage />} />
            <Route path="/thanh-toan/:planId" element={<CheckoutPage />} />
            <Route path="/thanh-toan/ket-qua" element={<PaymentResultPage />} />

            {/* Renter Features & Upgrade */}
            <Route path="/onboarding" element={<RenterOnboardingPage />} />
            <Route path="/onboarding/nguoi-thue" element={<RenterOnboardingPage />} />
            <Route path="/toi" element={<RenterProfilePage />} />
            <Route path="/ho-so" element={<RenterProfilePage />} />
            <Route path="/da-luu" element={<SavedRoomsPage />} />
            <Route path="/thong-bao" element={<NotificationsPage />} />
            <Route path="/tin-nhan" element={<ChatPage />} />
            <Route path="/tin-nhan/:threadId" element={<ChatPage />} />
            <Route path="/dat-lich/:roomId" element={<BookingPage />} />
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
              path="/chu-tro/tin-nhan"
              element={
                <OwnerRoute>
                  <ChatPage />
                </OwnerRoute>
              }
            />
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
                  <AdminModerationPage />
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
              path="/admin/thong-ke"
              element={
                <AdminRoute>
                  <AdminAnalyticsPage />
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
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
};

export default App;
