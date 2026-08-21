import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { ToastContainer } from './components/ui/ToastContainer';
import { useAppStore } from './store/useAppStore';
import { Button } from './components/ui/Button';
import { Building2, ArrowRight } from 'lucide-react';

// Pages
import { LandingPage } from './pages/LandingPage';
import { SearchPage } from './pages/SearchPage';
import { MapViewPage } from './pages/MapViewPage';
import { RoomDetailPage } from './pages/RoomDetailPage';
import { BuildingDetailPage } from './pages/BuildingDetailPage';
import { RoommateListPage } from './pages/RoommateListPage';
import { RoommateDetailPage } from './pages/RoommateDetailPage';
import { MarketplaceListPage } from './pages/MarketplaceListPage';
import { MarketplaceDetailPage } from './pages/MarketplaceDetailPage';
import { TrustVerificationPage } from './pages/TrustVerificationPage';

// Auth Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { OtpVerificationPage } from './pages/OtpVerificationPage';

// Renter Pages & Owner Upgrade
import { RenterOnboardingPage } from './pages/RenterOnboardingPage';
import { RenterProfilePage } from './pages/RenterProfilePage';
import { SavedRoomsPage } from './pages/SavedRoomsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ChatPage } from './pages/ChatPage';
import { BookingPage } from './pages/BookingPage';
import { OwnerUpgradePage } from './pages/OwnerUpgradePage';
import { OwnerApplicationStatusPage } from './pages/OwnerApplicationStatusPage';

// Owner Pages
import { OwnerOnboardingPage } from './pages/OwnerOnboardingPage';
import { OwnerDashboardPage } from './pages/OwnerDashboardPage';
import { OwnerBuildingListPage } from './pages/OwnerBuildingListPage';
import { OwnerCreateBuildingPage } from './pages/OwnerCreateBuildingPage';
import { OwnerCreateRoomPage } from './pages/OwnerCreateRoomPage';
import { OwnerRoomDetailPage } from './pages/OwnerRoomDetailPage';
import { OwnerProfilePage } from './pages/OwnerProfilePage';

// Admin Pages
import { AdminModerationPage } from './pages/AdminModerationPage';
import { AdminOwnerApplicationsPage } from './pages/AdminOwnerApplicationsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage';

// QA & 404
import { DebugPage } from './pages/DebugPage';
import { NotFoundPage } from './pages/NotFoundPage';

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
        </div>

        <Footer />
        <MobileBottomNav />
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
};

export default App;
