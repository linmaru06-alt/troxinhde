import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { ToastContainer } from './components/ui/ToastContainer';

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

// Renter Pages
import { RenterOnboardingPage } from './pages/RenterOnboardingPage';
import { RenterProfilePage } from './pages/RenterProfilePage';
import { SavedRoomsPage } from './pages/SavedRoomsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ChatPage } from './pages/ChatPage';
import { BookingPage } from './pages/BookingPage';

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

            {/* Renter Features */}
            <Route path="/onboarding" element={<RenterOnboardingPage />} />
            <Route path="/onboarding/nguoi-thue" element={<RenterOnboardingPage />} />
            <Route path="/toi" element={<RenterProfilePage />} />
            <Route path="/ho-so" element={<RenterProfilePage />} />
            <Route path="/da-luu" element={<SavedRoomsPage />} />
            <Route path="/thong-bao" element={<NotificationsPage />} />
            <Route path="/tin-nhan" element={<ChatPage />} />
            <Route path="/tin-nhan/:threadId" element={<ChatPage />} />
            <Route path="/dat-lich/:roomId" element={<BookingPage />} />

            {/* Owner Features */}
            <Route path="/chu-tro/onboarding" element={<OwnerOnboardingPage />} />
            <Route path="/onboarding/chu-tro" element={<OwnerOnboardingPage />} />
            <Route path="/chu-tro" element={<OwnerDashboardPage />} />
            <Route path="/chu-tro/tong-quan" element={<OwnerDashboardPage />} />
            <Route path="/chu-tro/toa-nha" element={<OwnerBuildingListPage />} />
            <Route path="/chu-tro/toa-nha/tao-moi" element={<OwnerCreateBuildingPage />} />
            <Route path="/chu-tro/toa-nha/:id" element={<BuildingDetailPage />} />
            <Route path="/chu-tro/phong/tao-moi" element={<OwnerCreateRoomPage />} />
            <Route path="/chu-tro/phong/tao-moi/:buildingId" element={<OwnerCreateRoomPage />} />
            <Route path="/chu-tro/phong/:id" element={<OwnerRoomDetailPage />} />
            <Route path="/chu-tro/tin-nhan" element={<ChatPage />} />
            <Route path="/chu-tro/thong-bao" element={<NotificationsPage />} />
            <Route path="/chu-tro/toi" element={<OwnerProfilePage />} />
            <Route path="/chu-tro/ho-so" element={<OwnerProfilePage />} />

            {/* Admin Features */}
            <Route path="/admin" element={<AdminModerationPage />} />
            <Route path="/admin/kiem-duyet" element={<AdminModerationPage />} />
            <Route path="/admin/nguoi-dung" element={<AdminUsersPage />} />
            <Route path="/admin/thong-ke" element={<AdminAnalyticsPage />} />

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
