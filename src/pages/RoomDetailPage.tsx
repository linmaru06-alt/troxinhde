import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useRealtimeRoomStatus } from "../hooks/useRealtimeRoomStatus";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { resolveUserIdToUuid } from "../lib/api/messages";
import { useAppStore } from "../store/useAppStore";
import { BookingRequest } from "../types";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { formatPrice, formatCurrency } from "../components/ui/Cards";
import { ReportModal } from "../components/modals/ReportModal";
import { LoginPromptModal } from "../components/modals/LoginPromptModal";
import { getReviews, createReview } from "../lib/api/reviews";
import { ImageUploader } from "../components/ui/ImageUploader";
import { ImageWithFallback } from "../components/ui/ImageWithFallback";
import { MiniRoomMap } from "../components/map/TroXinhMap";
import { SEOHead } from "../components/seo/SEOHead";
import {
  ShieldCheck,
  Heart,
  Share2,
  MapPin,
  CheckCircle2,
  MessageSquare,
  Phone,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Navigation,
  Star,
  Building2,
  Copy,
  Clock,
  Check,
  Zap,
  Droplets,
  Wifi,
  Receipt,
  FileCheck,
  HelpCircle,
  Eye,
} from "lucide-react";

import { ReportModal } from "../components/modals/ReportModal";
import { getOrCreateConversation } from "../lib/api/messages";

export const RoomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    rooms = [],
    buildings = [],
    currentUser,
    savedRoomIds = [],
    toggleSaveRoom,
    showToast,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<
    "costs" | "amenities" | "description" | "location" | "reviews"
  >("costs");
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [newReviewText, setNewReviewText] = useState<string>("");
  const [newReviewStars, setNewReviewStars] = useState<number>(5);
  const [reviewImages, setReviewImages] = useState<string[]>([]);

  const room = (rooms || []).find((r) => r.id === id);
  const building = (buildings || []).find(
    (b) => room && b.id === room.buildingId,
  );
  const isSaved = room ? (savedRoomIds || []).includes(room.id) : false;

  const isUnavailable =
    room?.status === "Đã cho thuê" ||
    room?.status === "Đã ẩn" ||
    room?.status === "Chờ duyệt";
  const isOwner = currentUser?.id === room?.ownerId;
  const isAdmin = currentUser?.role === "admin";
  const canView = room && (!isUnavailable || isOwner || isAdmin);

  if (!room) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="w-16 h-16 bg-emerald-50 text-[#00a854] rounded-full flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">
          Phòng Trọ Không Tồn Tại Hoặc Đã Bị Gỡ
        </h1>
        <p className="text-gray-500 text-sm mt-2 max-w-md">
          Tin đăng phòng này có thể đã hết hạn, đã được cho thuê hoặc đường dẫn
          không chính xác.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            to="/tim-kiem"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00a854] hover:bg-[#009249] text-white font-bold text-sm shadow-md transition"
          >
            ← Khám Phá Phòng Trọ Khác
          </Link>
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">
          Phòng Trọ Không Có Sẵn
        </h1>
        <p className="text-gray-500 text-sm mt-2 max-w-md">
          Chủ trọ đã tạm ẩn tin đăng hoặc phòng đã có người thuê. Bạn có thể
          tham khảo các phòng trọ khác.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            to="/tim-kiem"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00a854] hover:bg-[#009249] text-white font-bold text-sm shadow-md transition"
          >
            ← Khám Phá Phòng Trọ Khác
          </Link>
        </div>
      </div>
    );
  }

  // Monthly Estimated Cost Breakdown Calculation
  const estimatedElectricity = 80 * (room.electricityPrice || 3800); // approx 80 kWh/month for student
  const estimatedWater = 100000; // approx 100k/person
  const estimatedInternet = 100000;
  const estimatedServices = 150000; // cleaning, elevator, parking
  const totalEstimatedMonthly =
    room.price +
    estimatedElectricity +
    estimatedWater +
    estimatedInternet +
    estimatedServices;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: room.title,
          text: `Phòng trọ đẹp giá ${formatPrice(room.price)} tại ${room.address}`,
          url: window.location.href,
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }
    navigator.clipboard.writeText(window.location.href);
    showToast(
      "Đã sao chép liên kết phòng trọ!",
      "Bạn có thể gửi cho bạn bè để cùng xem.",
      "success",
    );
  };

  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  const handleContactChat = async () => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    if (currentUser.id === room.ownerId) {
      showToast(
        "Bạn là chủ bài đăng này",
        "Không thể tự nhắn tin cho chính mình.",
        "info",
      );
      return;
    }

    setIsChatLoading(true);
    try {
      const convId = await getOrCreateConversation(
        currentUser.id,
        room.ownerId,
        room.id,
        {
          otherName: room.ownerName || "Chủ trọ",
          otherAvatar: room.ownerAvatar,
          roomTitle: room.title,
        },
      );
      navigate(`/tin-nhan/${convId}`);
    } catch (err: any) {
      console.error("[RoomDetailPage] Lỗi mở cuộc trò chuyện:", err);
      showToast(
        "Không thể mở cuộc trò chuyện",
        err?.message || "Vui lòng thử lại sau.",
        "error",
      );
    } finally {
      setIsChatLoading(false);
    }
  };

  // Fetch reviews thật từ Supabase
  useEffect(() => {
    if (!room?.id) return;
    let isMounted = true;
    getReviews(room.id)
      .then((data) => {
        if (!isMounted) return;
        if (data && data.length > 0) {
          const mapped = data.map((r: any) => ({
            id: r.id,
            roomId: r.room_id,
            userId: r.reviewer_id,
            userName: r.reviewer?.full_name || "Khách thuê Trọ Xinh",
            userAvatar: r.reviewer?.avatar_url || "/images/user-avatar.webp",
            stars: r.rating || 5,
            criteria: { cleanliness: 5, landlord: 5, accuracy: 5, location: 5 },
            text: r.content || "",
            createdAt: r.created_at || new Date().toISOString(),
          }));
          setUserReviews(mapped);
        } else {
          setUserReviews([]);
        }
      })
      .catch((err) => {
        console.warn("[Reviews] Không thể lấy reviews từ Supabase:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [room?.id]);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    if (!newReviewText.trim()) return;

    try {
      const created = await createReview({
        room_id: room.id,
        reviewer_id: currentUser.id,
        rating: newReviewStars,
        content: newReviewText.trim(),
        image_urls: reviewImages,
      });

      const newRev = {
        id: created?.id || `rev_${Date.now()}`,
        roomId: room.id,
        userId: currentUser.id,
        userName: currentUser.name || "Khách thuê",
        userAvatar: currentUser.avatarUrl || "/images/user-avatar.webp",
        stars: newReviewStars,
        criteria: { cleanliness: 5, landlord: 5, accuracy: 5, location: 5 },
        text: newReviewText.trim(),
        createdAt: new Date().toISOString(),
      };
      setUserReviews([newRev, ...userReviews]);
      setNewReviewText("");
      setReviewImages([]);
      setShowReviewModal(false);
      showToast(
        "Đã gửi đánh giá thành công! ⭐",
        "Cảm ơn bạn đã đóng góp cho cộng đồng.",
        "success",
      );
    } catch (err: any) {
      showToast(
        "Gửi đánh giá thất bại",
        err?.message || "Vui lòng thử lại sau!",
        "error",
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-24 lg:pb-8">
      <SEOHead
        title={`${room.title} - ${formatPrice(room.price)} | TroXinh`}
        description={`${room.area}m² tại ${room.district}, ${room.address}. Gần ${room.nearestSchool}. Đầy đủ tiện nghi: ${room.amenities.slice(0, 4).join(", ")}. Liên hệ ngay để đặt lịch xem phòng.`}
        image={room.images[0]}
        url={`/phong/${room.id}`}
        type="article"
        accommodation={{
          name: room.title,
          description: room.description,
          images: room.images,
          address: room.address,
          district: room.district,
          price: room.price,
          avgRating: 4.9,
          reviewCount: userReviews.length || 5,
        }}
      />

      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs text-gray-500 overflow-x-auto">
        <Link to="/" className="hover:text-[#006d37]">
          Trang chủ
        </Link>
        <span>/</span>
        <Link to="/tim-phong" className="hover:text-[#006d37]">
          Tìm phòng
        </Link>
        <span>/</span>
        <Link
          to={`/tim-phong?khuVuc=${encodeURIComponent(room.district)}`}
          className="hover:text-[#006d37]"
        >
          {room.district}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-bold truncate">{room.title}</span>
      </div>

      {/* Main Grid: Gallery & Details (Left) + Sticky Booking Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT COLUMN: 2 Cols */}
        <div className="lg:col-span-2 space-y-8">
          {/* 1. Image Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-16/10 w-full overflow-hidden rounded-3xl bg-gray-100 shadow-md">
              <ImageWithFallback
                src={room.images[activeImageIndex] || room.images[0]}
                alt={room.title}
                preset="gallery"
                loading="eager"
                fallback="room"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {room.verified ? (
                  <Badge variant="verified" size="md">
                    Đã đối chiếu thông tin
                  </Badge>
                ) : (
                  <Badge variant="pending" size="md">
                    Đang đối chiếu
                  </Badge>
                )}
                <Badge variant="available" size="md">
                  {room.status}
                </Badge>
              </div>

              {/* Share & Heart */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  onClick={handleShare}
                  className="p-2.5 bg-white/90 hover:bg-white text-gray-700 rounded-full shadow-md backdrop-blur-xs transition"
                  title="Chia sẻ"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleSaveRoom(room.id)}
                  className={`p-2.5 rounded-full shadow-md backdrop-blur-xs transition ${
                    isSaved
                      ? "bg-rose-500 text-white"
                      : "bg-white/90 hover:bg-white text-gray-700"
                  }`}
                  title="Lưu phòng"
                >
                  <Heart
                    className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`}
                  />
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            {room.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {room.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 transition shrink-0 ${
                      activeImageIndex === idx
                        ? "border-[#006d37] scale-105"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <ImageWithFallback
                      src={img}
                      alt=""
                      preset="thumbnail"
                      fallback="room"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Title & Key Summary */}
          <div className="space-y-4 bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#006d37] mb-1.5 uppercase tracking-wide">
                <Navigation className="w-3.5 h-3.5" />
                <span>{room.nearestSchool}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-snug">
                {room.title}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 mt-1.5">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                {room.address}, {room.district}
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-center">
              <div>
                <span className="text-[11px] text-gray-500 font-medium block">
                  Giá thuê tháng
                </span>
                <span className="text-lg font-black text-[#006d37]">
                  {formatPrice(room.price)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 font-medium block">
                  Diện tích
                </span>
                <span className="text-base font-bold text-gray-900">
                  {room.area} m²
                </span>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 font-medium block">
                  Tiền đặt cọc
                </span>
                <span className="text-base font-bold text-gray-900">
                  {formatCurrency(room.deposit)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 font-medium block">
                  Tổng dự kiến
                </span>
                <span className="text-sm font-black text-emerald-800">
                  ~{formatPrice(totalEstimatedMonthly)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. MULTI-TIER TRUST & VERIFICATION BOX */}
          <div className="bg-white rounded-3xl p-6 border border-emerald-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#006d37] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">
                    Mức độ xác minh thông tin
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Được đối chiếu và bảo đảm bởi quy trình kiểm duyệt TroXinh
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Đã kiểm tra 30 ngày qua
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
                <CheckCircle2 className="w-4 h-4 text-[#006d37] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900 font-bold">
                    Chủ trọ đã xác minh danh tính
                  </strong>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    CCCD và số điện thoại chính chủ đã được lưu trữ đối soát.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
                <CheckCircle2 className="w-4 h-4 text-[#006d37] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900 font-bold">
                    Giá thuê & Phụ phí công khai
                  </strong>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Đã đối chiếu đơn giá điện, nước, cọc, không thu phụ phí ẩn.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
                <CheckCircle2 className="w-4 h-4 text-[#006d37] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900 font-bold">
                    Hình ảnh thực tế phòng
                  </strong>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Ảnh chụp hiện trạng nội thất, ánh sáng và không gian phòng.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900 font-bold">
                    Khảo sát & Cập nhật gần nhất
                  </strong>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Trạng thái phòng được đối soát trong 30 ngày gần đây.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                Phát hiện thông tin sai khác thực tế?
              </span>
              <button
                onClick={() => setShowReportModal(true)}
                className="font-bold text-rose-600 hover:underline flex items-center gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Báo thông tin sai
              </button>
            </div>
          </div>

          {/* 4. Detailed Tabs (Cost Breakdown, Amenities, Description, Location, Reviews) */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-6">
            {/* Tab Headers */}
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 overflow-x-auto">
              {[
                { key: "costs", label: "Bảng chi phí dự kiến", icon: Receipt },
                { key: "amenities", label: "Tiện nghi phòng", icon: Sparkles },
                {
                  key: "description",
                  label: "Mô tả & Quy định",
                  icon: FileCheck,
                },
                { key: "location", label: "Vị trí & Trường ĐH", icon: MapPin },
                {
                  key: "reviews",
                  label: `Đánh giá (${userReviews.length})`,
                  icon: Star,
                },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
                      activeTab === t.key
                        ? "bg-[#006d37] text-white shadow-xs"
                        : "text-gray-600 hover:text-[#006d37] hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: COSTS BREAKDOWN (MINH BẠCH CHI PHÍ) */}
            {activeTab === "costs" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">
                    Bóc tách chi phí hàng tháng dự kiến:
                  </h3>
                  <p className="text-xs text-gray-500">
                    Minh bạch toàn bộ chi phí trước khi đi xem phòng để dễ dàng
                    cân đối ngân sách.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 overflow-hidden text-xs">
                  <div className="grid grid-cols-12 bg-gray-50 p-3 font-bold text-gray-700 border-b border-gray-200">
                    <div className="col-span-7 sm:col-span-8">Khoản phí</div>
                    <div className="col-span-5 sm:col-span-4 text-right">
                      Đơn giá / Định mức
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    <div className="grid grid-cols-12 p-3 items-center">
                      <div className="col-span-7 sm:col-span-8 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#006d37]" />
                        <strong className="text-gray-900 font-bold">
                          Tiền thuê phòng
                        </strong>
                      </div>
                      <div className="col-span-5 sm:col-span-4 text-right font-bold text-gray-900">
                        {formatCurrency(room.price)} / tháng
                      </div>
                    </div>

                    <div className="grid grid-cols-12 p-3 items-center bg-gray-50/40">
                      <div className="col-span-7 sm:col-span-8 flex items-center gap-2 text-gray-600">
                        <FileCheck className="w-3.5 h-3.5 text-gray-400" />
                        <span>Tiền đặt cọc hợp đồng</span>
                      </div>
                      <div className="col-span-5 sm:col-span-4 text-right font-medium text-gray-700">
                        {formatCurrency(room.deposit)} (hoàn cọc khi kết thúc
                        HĐ)
                      </div>
                    </div>

                    <div className="grid grid-cols-12 p-3 items-center">
                      <div className="col-span-7 sm:col-span-8 flex items-center gap-2 text-gray-600">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Tiền điện sinh hoạt</span>
                      </div>
                      <div className="col-span-5 sm:col-span-4 text-right font-medium text-gray-700">
                        {room.electricityPrice.toLocaleString("vi-VN")} đ / kWh
                        (công tơ riêng)
                      </div>
                    </div>

                    <div className="grid grid-cols-12 p-3 items-center bg-gray-50/40">
                      <div className="col-span-7 sm:col-span-8 flex items-center gap-2 text-gray-600">
                        <Droplets className="w-3.5 h-3.5 text-blue-500" />
                        <span>Tiền nước sinh hoạt</span>
                      </div>
                      <div className="col-span-5 sm:col-span-4 text-right font-medium text-gray-700">
                        {room.waterPrice.toLocaleString("vi-VN")} đ / người /
                        tháng
                      </div>
                    </div>

                    <div className="grid grid-cols-12 p-3 items-center">
                      <div className="col-span-7 sm:col-span-8 flex items-center gap-2 text-gray-600">
                        <Wifi className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Internet cáp quang tốc độ cao</span>
                      </div>
                      <div className="col-span-5 sm:col-span-4 text-right font-medium text-gray-700">
                        100.000 đ / phòng / tháng
                      </div>
                    </div>

                    <div className="grid grid-cols-12 p-3 items-center bg-gray-50/40">
                      <div className="col-span-7 sm:col-span-8 flex items-center gap-2 text-gray-600">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Phí dịch vụ chung (Vệ sinh, máy giặt, rác, thang máy)
                        </span>
                      </div>
                      <div className="col-span-5 sm:col-span-4 text-right font-medium text-gray-700">
                        150.000 đ / người / tháng
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 p-4 bg-emerald-50/80 border-t-2 border-emerald-200 items-center">
                    <div className="col-span-6 sm:col-span-7">
                      <strong className="text-sm font-extrabold text-[#006d37] block">
                        Tổng chi phí dự kiến / tháng:
                      </strong>
                      <span className="text-[11px] text-gray-500">
                        (Ước tính cho 1 người ở, 80 kWh điện)
                      </span>
                    </div>
                    <div className="col-span-6 sm:col-span-5 text-right">
                      <span className="text-lg sm:text-xl font-black text-[#006d37]">
                        ~ {formatCurrency(totalEstimatedMonthly)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: AMENITIES */}
            {activeTab === "amenities" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900">
                  Danh mục tiện nghi có sẵn trong phòng:
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {room.amenities.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-semibold text-gray-800"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#006d37] shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: DESCRIPTION & RULES */}
            {activeTab === "description" && (
              <div className="space-y-4 text-xs sm:text-sm text-gray-700 leading-relaxed">
                <p>{room.description}</p>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <h4 className="font-bold text-gray-900">
                    Quy định chung của nhà trọ:
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                    <li>
                      Giờ giấc tự do 24/24, ra vào bằng khóa vân tay an ninh.
                    </li>
                    <li>
                      Khu trọ an ninh, có camera hành lang 24/7 và hệ thống PCCC
                      đạt chuẩn.
                    </li>
                    <li>
                      Hợp đồng thuê tối thiểu 06 tháng, thanh toán tiền phòng
                      đầu tháng.
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-emerald-900 font-medium">
                    Bảo vệ quyền lợi người thuê:
                  </span>
                  <Link
                    to="/hop-dong-mau"
                    target="_blank"
                    className="font-bold text-[#006d37] hover:underline flex items-center gap-1"
                  >
                    Xem mẫu hợp đồng chuẩn →
                  </Link>
                </div>
              </div>
            )}

            {/* TAB 4: LOCATION */}
            {activeTab === "location" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">
                    Vị trí thực tế trên bản đồ:
                  </h3>
                  <MiniRoomMap
                    roomTitle={room.title}
                    buildingName={building?.name}
                    nearestSchool={room.nearestSchool}
                    className="h-72 rounded-2xl overflow-hidden"
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">
                    Khoảng cách tới các trường đại học:
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {building?.nearbyUniversities?.map((u, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs"
                      >
                        <span className="font-bold text-gray-800">
                          🎓 {u.name}
                        </span>
                        <span className="text-[#006d37] font-semibold">
                          Cách {u.distanceKm} km
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: REVIEWS */}
            {activeTab === "reviews" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-3xl font-black text-amber-500">
                      4.9
                    </div>
                    <div>
                      <div className="flex text-amber-400 text-sm">★★★★★</div>
                      <span className="text-xs text-gray-500">
                        {userReviews.length} đánh giá từ người thuê thực tế
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!currentUser) {
                        showToast(
                          "Vui lòng đăng nhập",
                          "Bạn cần đăng nhập để viết đánh giá.",
                          "error",
                        );
                        return;
                      }

                      let hasCompletedBooking = false;

                      // Check local first
                      if (
                        bookings.some(
                          (b) =>
                            b.roomId === room.id &&
                            b.renterId === currentUser.id &&
                            (b.status === "completed" ||
                              b.status === ("Đã xem phòng" as any)),
                        )
                      ) {
                        hasCompletedBooking = true;
                      }

                      // Check Supabase if configured
                      if (!hasCompletedBooking && isSupabaseConfigured) {
                        try {
                          const { data } = await supabase
                            .from("viewing_requests")
                            .select("id")
                            .eq("room_id", room.id)
                            .eq(
                              "renter_id",
                              await resolveUserIdToUuid(currentUser.id),
                            )
                            .eq("status", "completed")
                            .limit(1);

                          if (data && data.length > 0)
                            hasCompletedBooking = true;
                        } catch (e) {}
                      }

                      if (currentUser.role === "admin" || hasCompletedBooking) {
                        setShowReviewModal(true);
                      } else {
                        showToast(
                          "Không thể đánh giá",
                          "Bạn chỉ có thể đánh giá sau khi đã hoàn thành lịch xem phòng thực tế để đảm bảo tính khách quan.",
                          "error",
                        );
                      }
                    }}
                  >
                    Viết Đánh Giá
                  </Button>
                </div>

                {/* Review List */}
                {userReviews.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-xs space-y-1.5 border-t border-gray-100">
                    <p className="font-semibold text-gray-700">
                      Chưa có đánh giá nào cho phòng trọ này
                    </p>
                    <p>
                      Hãy là người đầu tiên trải nghiệm thực tế và để lại nhận
                      xét đóng góp cho cộng đồng!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    {userReviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-4 rounded-2xl bg-gray-50 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={rev.userAvatar}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <h4 className="text-xs font-bold text-gray-900">
                                {rev.userName}
                              </h4>
                              <div className="flex text-amber-400 text-xs">
                                {Array.from({ length: rev.stars }).map(
                                  (_, i) => "★",
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] text-gray-400">
                            {new Date(rev.createdAt).toLocaleDateString(
                              "vi-VN",
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {rev.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Linked Building Overview Card */}
          {building && (
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={building.images[0]}
                  alt={building.name}
                  className="w-16 h-16 rounded-2xl object-cover shrink-0"
                />
                <div>
                  <span className="text-[11px] font-bold text-[#006d37] uppercase">
                    Thuộc Tòa Nhà
                  </span>
                  <h4 className="text-sm font-bold text-gray-900">
                    {building.name}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {building.totalRooms} phòng • Đã kiểm duyệt PCCC
                  </p>
                </div>
              </div>

              <Link to={`/toa-nha/${building.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  Xem Toàn Bộ Tòa Nhà
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Sticky Booking & Owner Card (Desktop) */}
        <div className="hidden lg:block space-y-6 lg:sticky lg:top-24">
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-md space-y-6">
            {/* Owner Info */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <img
                src={room.ownerAvatar}
                alt={room.ownerName}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-200"
              />
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-gray-900 truncate">
                    {room.ownerName}
                  </h4>
                  <Badge variant="verified" size="sm" showIcon={false}>
                    Chính chủ
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">
                  Phản hồi tin nhắn trong 5 phút
                </p>
              </div>
            </div>

            {/* Price Preview */}
            <div className="space-y-1">
              <span className="text-xs text-gray-400">
                Giá thuê chính thức:
              </span>
              <div className="text-2xl font-black text-[#006d37]">
                {formatPrice(room.price)}
              </div>
              <p className="text-[11px] text-gray-500">
                Tổng dự kiến:{" "}
                <strong className="text-emerald-800">
                  ~{formatPrice(totalEstimatedMonthly)}
                </strong>
              </p>
            </div>

            {/* Action Buttons (Desktop Sidebar Only - Mobile uses fixed Bottom CTA) */}
            <div className="hidden lg:flex flex-col space-y-2.5">
              {isUnavailable ? (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-center text-sm font-bold border border-rose-200">
                  Phòng này hiện không có sẵn (Trạng thái: {room.status})
                </div>
              ) : (
                <>
                  <Link to={`/dat-lich/${room.id}`} className="block">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full shadow-md font-bold"
                      leftIcon={<Calendar className="w-5 h-5" />}
                    >
                      Đặt Lịch Xem Phòng
                    </Button>
                  </Link>

                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full"
                    onClick={handleContactChat}
                    leftIcon={<MessageSquare className="w-4 h-4" />}
                  >
                    Nhắn Tin Cho Chủ Trọ
                  </Button>

                  <a href={`tel:${room.ownerPhone}`} className="block">
                    <Button
                      variant="outline"
                      size="md"
                      className="w-full"
                      leftIcon={<Phone className="w-4 h-4 text-[#006d37]" />}
                    >
                      Gọi Điện ({room.ownerPhone})
                    </Button>
                  </a>
                </>
              )}

              <Button
                variant={isSaved ? "primary" : "outline"}
                size="md"
                className="w-full"
                onClick={() => toggleSaveRoom(room.id)}
                leftIcon={
                  <Heart
                    className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`}
                  />
                }
              >
                {isSaved ? "Đã Lưu Phòng" : "Lưu Phòng Trọ"}
              </Button>
            </div>

            {/* Trust Checklist */}
            <div className="p-3.5 bg-emerald-50/70 rounded-2xl text-[11px] text-emerald-900 space-y-1.5 border border-emerald-100">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-[#006d37]" />
                Bảo vệ người thuê:
              </div>
              <p>• Không thu phí môi giới hay phí xem phòng.</p>
              <p>• Xác nhận lịch hẹn trực tiếp với chủ trọ.</p>
            </div>

            {/* Report link */}
            <div className="text-center pt-2">
              <button
                onClick={() => setShowReportModal(true)}
                className="text-xs text-gray-400 hover:text-rose-600 transition flex items-center justify-center gap-1 mx-auto"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Báo cáo thông tin không chính xác
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM ACTION CTA BAR - DUY NHẤT 1 THANH TRÊN MOBILE */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 pt-2.5"
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))",
        }}
      >
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-1 justify-between w-full">
            <button
              onClick={() => toggleSaveRoom(room.id)}
              className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-bold shadow-xs shrink-0 ${isSaved ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"}`}
              aria-label="Lưu phòng"
              title="Lưu phòng"
            >
              <Heart className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
            </button>

            {isUnavailable ? (
              <div className="flex-1 p-2.5 bg-rose-50 text-rose-700 rounded-xl text-center text-xs font-bold border border-rose-200">
                Phòng đã thuê/ẩn
              </div>
            ) : (
              <>
                <button
                  onClick={handleContactChat}
                  disabled={isChatLoading}
                  className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#006d37] border border-emerald-200 flex items-center justify-center font-bold shadow-xs shrink-0 disabled:opacity-50 cursor-pointer"
                  title="Nhắn tin"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>

                <a
                  href={`tel:${room.ownerPhone}`}
                  className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#006d37] border border-emerald-200 flex items-center justify-center font-bold shadow-xs shrink-0 cursor-pointer"
                  title="Gọi điện"
                >
                  <Phone className="w-5 h-5" />
                </a>

                <Link to={`/dat-lich/${room.id}`} className="flex-1">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full font-bold shadow-md h-11 text-xs px-2.5"
                    leftIcon={<Calendar className="w-4 h-4" />}
                  >
                    Đặt Lịch
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetId={room.id}
          targetTitle={room.title}
          targetType="room"
        />
      )}
    </div>
  );
};
