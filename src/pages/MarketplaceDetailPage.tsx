import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ImageUploader } from '../components/ui/ImageUploader';
import { MarketplaceCard, formatCurrency } from '../components/ui/Cards';
import { ReportModal } from '../components/modals/ReportModal';
import {
  ShoppingBag,
  MapPin,
  Clock,
  ShieldCheck,
  MessageSquare,
  Phone,
  AlertTriangle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Tag,
  Camera,
  Share2,
  Edit,
  Save,
  Check,
} from 'lucide-react';
import { getOrCreateConversation } from '../lib/api/messages';

const CATEGORY_ICONS: Record<string, string> = {
  'Nội thất': '🪑',
  'Đồ điện tử': '⚡',
  'Sách vở': '📚',
  'Đồ gia dụng': '🍳',
};

export const MarketplaceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { marketplaceItems, currentUser, updateMarketplaceItem, showToast } = useAppStore();

  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  const item = marketplaceItems.find((i) => i.id === id) || marketplaceItems[0];

  // Edit Item Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>(item?.name || '');
  const [editPrice, setEditPrice] = useState<number>(item?.price || 0);
  const [editPricingType, setEditPricingType] = useState<'Giá rẻ' | 'Miễn phí'>(item?.pricingType || 'Giá rẻ');
  const [editCategory, setEditCategory] = useState<'Nội thất' | 'Đồ điện tử' | 'Sách vở' | 'Đồ gia dụng'>(
    item?.category || 'Nội thất'
  );
  const [editCondition, setEditCondition] = useState<
    'Mới 99%' | 'Còn dùng tốt' | 'Đã qua sử dụng' | 'Dùng tốt' | 'Tặng miễn phí'
  >(item?.condition || 'Còn dùng tốt');
  const [editLocation, setEditLocation] = useState<string>(item?.location || '');
  const [editDistrict, setEditDistrict] = useState<string>(item?.district || '');
  const [editDescription, setEditDescription] = useState<string>(item?.description || '');
  const [editImages, setEditImages] = useState<string[]>(item?.images || []);
  const [editStatus, setEditStatus] = useState<'Còn hàng' | 'Đã bán'>(item?.status || 'Còn hàng');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Sync edit state whenever item changes or modal opens
  useEffect(() => {
    if (item) {
      setEditTitle(item.name);
      setEditPrice(item.price);
      setEditPricingType(item.pricingType);
      setEditCategory(item.category);
      setEditCondition(item.condition);
      setEditLocation(item.location);
      setEditDistrict(item.district);
      setEditDescription(item.description);
      setEditImages(item.images || []);
      setEditStatus(item.status || 'Còn hàng');
    }
  }, [item, isEditModalOpen]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      showToast('Thiếu tiêu đề', 'Vui lòng nhập tên món đồ', 'warning');
      return;
    }
    if (editImages.length === 0) {
      showToast('Thiếu ảnh', 'Vui lòng tải lên ít nhất 1 ảnh sản phẩm', 'warning');
      return;
    }

    setIsSavingEdit(true);
    try {
      updateMarketplaceItem(item.id, {
        name: editTitle.trim(),
        price: editPricingType === 'Miễn phí' ? 0 : Number(editPrice),
        pricingType: editPricingType,
        category: editCategory,
        condition: editCondition,
        location: editLocation,
        district: editDistrict,
        description: editDescription.trim(),
        images: editImages,
        status: editStatus,
      });

      setIsEditModalOpen(false);
      showToast('Cập nhật tin thành công!', 'Các thay đổi đã được áp dụng ngay lập tức', 'success');
    } catch (err: any) {
      showToast('Lỗi cập nhật', err?.message || 'Không thể lưu thay đổi. Dữ liệu đã được giữ nguyên.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (!item) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Không tìm thấy món đồ thanh lý</h2>
        <p className="text-xs text-gray-500">Món đồ có thể đã được pass hoặc xóa khỏi hệ thống.</p>
        <Link to="/cho-do-cu" className="inline-block">
          <Button variant="primary" size="sm">
            ← Về Chợ Đồ Cũ Sinh Viên
          </Button>
        </Link>
      </div>
    );
  }

  const images = Array.isArray(item.images) && item.images.length > 0
    ? item.images
    : ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'];

  const categoryIcon = CATEGORY_ICONS[item.category] || '📦';

  // Related items in same category or district
  const relatedItems = marketplaceItems
    .filter((i) => i.id !== item.id && (i.category === item.category || i.district === item.district))
    .slice(0, 4);

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: item.name,
        text: `Xem món đồ thanh lý "${item.name}" trên Trọ Xinh`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Đã sao chép liên kết!', 'Bạn có thể gửi link cho bạn bè', 'info');
    }
  };

  const handleContactSeller = async () => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để nhắn tin với người bán', 'warning');
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent(`/cho-do-cu/${item.id}`)}`);
      return;
    }
    if (currentUser.id === item.userId) {
      showToast('Đây là món đồ của bạn', 'Không thể tự nhắn tin cho chính mình', 'info');
      return;
    }

    setIsChatLoading(true);
    try {
      const convId = await getOrCreateConversation(
        currentUser.id,
        item.userId,
        undefined,
        {
          otherName: item.userName || 'Người bán',
          otherAvatar: item.userAvatar,
        }
      );
      navigate(`/tin-nhan/${convId}`);
    } catch (err: any) {
      console.error('[MarketplaceDetail] Lỗi mở chat:', err);
      showToast('Không thể mở cuộc trò chuyện', err?.message || 'Vui lòng thử lại sau', 'error');
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* 1. Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-1.5 truncate">
          <Link to="/" className="hover:text-[#006d37]">Trang chủ</Link>
          <span>/</span>
          <Link to="/cho-do-cu" className="hover:text-[#006d37]">Chợ đồ cũ</Link>
          <span>/</span>
          <span className="text-gray-400">{item.category}</span>
          <span>/</span>
          <span className="text-gray-900 font-bold truncate max-w-[200px] sm:max-w-xs">{item.name}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            leftIcon={<Edit className="w-3.5 h-3.5 text-[#006d37]" />}
            className="text-xs border-[#006d37]/40 text-[#006d37] hover:bg-emerald-50"
          >
            Sửa Tin Này
          </Button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Chia sẻ</span>
          </button>
        </div>
      </div>

      {/* 2. Main Product Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-8 border border-gray-200 shadow-md space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Photo Gallery with Supplementary Images (5 cols) */}
          <div className="lg:col-span-6 space-y-3">
            {/* Featured Big Image */}
            <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-gray-900 shadow-inner group border border-gray-200">
              <img
                src={images[selectedImageIndex] || images[0]}
                alt={`${item.name} - ảnh ${selectedImageIndex + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                onClick={() => setIsZoomOpen(true)}
              />

              {/* Top-left Badges */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10 pointer-events-none">
              <Badge variant={item.pricingType === 'Miễn phí' ? 'free' : (item.price > 0 ? 'cheap' : 'outline')} size={"md"}>
                  {item.pricingType === 'Miễn phí'
                    ? ' Tặng Miễn Phí 0đ'
                    : item.price > 0
                      ? formatCurrency(item.price)
                      : ' Liên hệ giá'}
                </Badge>
              </div>

              {/* Top-right Image count & Zoom button */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                <span className="bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-white/20">
                  <Camera className="w-3.5 h-3.5 text-amber-300" />
                  {selectedImageIndex + 1} / {images.length}
                </span>
                <button
                  onClick={() => setIsZoomOpen(true)}
                  className="bg-black/60 hover:bg-black/80 backdrop-blur-md text-white p-1.5 rounded-lg border border-white/20 transition cursor-pointer"
                  title="Phóng to ảnh"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Prev / Next navigation arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-xs transition opacity-80 hover:opacity-100 z-10 cursor-pointer"
                    aria-label="Ảnh trước"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-xs transition opacity-80 hover:opacity-100 z-10 cursor-pointer"
                    aria-label="Ảnh tiếp theo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Bottom Condition Pill */}
              <div className="absolute bottom-3 left-3 z-10 bg-slate-950/80 backdrop-blur-xs text-white text-xs font-semibold px-2.5 py-1 rounded-lg border border-white/10">
                Tình trạng: {item.condition}
              </div>

              {/* Sold Overlay */}
              {item.status === 'Đã bán' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20 rounded-2xl">
                  <span className="bg-rose-600 text-white text-sm font-black px-6 py-2 rounded-full shadow-xl uppercase tracking-widest border-2 border-white/30">
                    Đã bán
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail Strip (Hình ảnh bổ trợ các góc chụp) */}
            {images.length > 1 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium px-1">
                  <span>Hình ảnh chi tiết các góc chụp ({images.length} ảnh):</span>
                  <span className="text-[#006d37] font-semibold">Click để đổi góc xem</span>
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative aspect-4/3 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedImageIndex === idx
                          ? 'border-[#006d37] ring-2 ring-[#006d37]/30 scale-95 shadow-xs'
                          : 'border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Góc ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded">
                        #{idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Product Details (7 cols) */}
          <div className="lg:col-span-6 space-y-5">
            {/* Header: Name, Price, Category, Area */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#006d37]">
                  <span>{categoryIcon}</span>
                  <span>{item.category}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>{item.condition}</span>
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 leading-snug">
                {item.name}
              </h1>

              {/* Price Row */}
              <div className="flex flex-wrap items-baseline gap-3 pt-1">
                <span className={`text-2xl sm:text-3xl font-black ${item.status === 'Đã bán' ? 'text-gray-400 line-through' : 'text-[#006d37]'}`}>
                  {item.pricingType === 'Miễn phí'
                    ? 'Tặng 0đ (Miễn phí)'
                    : item.price > 0
                      ? formatCurrency(item.price)
                      : 'Liên hệ thỏa thuận'}
                </span>
                {item.pricingType === 'Miễn phí' && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                    🎁 Đồ tặng sinh viên
                  </span>
                )}
                {item.pricingType === 'Giá rẻ' && (!item.price || item.price === 0) && (
                  <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                    ⚠️ Chưa nhập giá
                  </span>
                )}
              </div>

              {/* Status: Còn hàng / Đã bán */}
              <div className="flex items-center gap-2 pt-1">
                {item.status === 'Đã bán' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                    Đã đóng — Hết hàng
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    Còn hàng
                  </span>
                )}
              </div>
            </div>

            {/* Core Attributes Specification Grid (6 thông tin cốt lõi) */}
            <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-gray-50/90 rounded-2xl border border-gray-100 text-xs">
              <div className="space-y-0.5">
                <span className="text-gray-400 font-medium flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-gray-400" /> Danh mục:
                </span>
                <span className="font-bold text-gray-900 block">{item.category}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-gray-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Tình trạng:
                </span>
                <span className="font-bold text-gray-900 block">{item.condition}</span>
              </div>
              <div className="space-y-0.5 col-span-2 pt-2 border-t border-gray-200/60">
                <span className="text-gray-400 font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Khu vực lấy đồ:
                </span>
                <span className="font-bold text-gray-900 block">
                  {item.location ? `${item.location}, ${item.district}` : item.district}
                </span>
              </div>
            </div>

            {/* Description from Seller */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>📝 Mô tả từ người bán:</span>
              </h3>
              <div className="text-xs text-gray-700 leading-relaxed bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200/80 whitespace-pre-line">
                {item.description || 'Đồ thanh lý sinh viên chính chủ, liên hệ trực tiếp để xem đồ.'}
              </div>
            </div>

            {/* Seller Contact Card */}
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-100 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <img
                  src={item.userAvatar || '/images/user-avatar.jpg'}
                  alt={item.userName}
                  className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs"
                />
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{item.userName}</h4>
                  <p className="text-[11px] text-[#006d37] font-semibold flex items-center gap-1">
                    ✓ Đã xác minh sinh viên
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {item.status === 'Đã bán' ? (
                  <span className="text-xs text-gray-400 font-medium italic">Món đồ này đã được bán</span>
                ) : (
                  <>
                    {item.userPhone && (
                      <a href={`tel:${item.userPhone}`}>
                        <Button variant="outline" size="sm" leftIcon={<Phone className="w-3.5 h-3.5" />}>
                          Gọi {item.userPhone}
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isChatLoading}
                      onClick={handleContactSeller}
                      leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                      className="shadow-sm"
                    >
                      {isChatLoading ? 'Đang mở...' : 'Nhắn Tin Ngay'}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Safety Tips Callout */}
            <div className="p-3.5 bg-amber-50/90 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
              <h4 className="font-bold flex items-center gap-1.5 text-amber-800">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                Mẹo an toàn khi giao dịch đồ cũ sinh viên:
              </h4>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                • Hẹn gặp trực tiếp tại nơi công cộng đông người (sảnh trường ĐH, phòng bảo vệ KTX) để kiểm tra đồ trước khi thanh toán.
              </p>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                • Tuyệt đối không chuyển tiền đặt cọc trước khi trực tiếp kiểm tra món đồ.
              </p>
            </div>

            {/* Report link */}
            <div className="text-center pt-1">
              <button
                onClick={() => setShowReport(true)}
                className="text-xs text-gray-400 hover:text-rose-600 transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Báo cáo tin đăng vi phạm quy tắc chợ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Related Marketplace Items Section */}
      {relatedItems.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                Món đồ tương tự cùng danh mục & khu vực
              </h3>
              <p className="text-xs text-gray-500">
                Khám phá thêm các đồ cũ thanh lý gần bạn
              </p>
            </div>
            <Link to="/cho-do-cu">
              <Button variant="outline" size="sm">
                Xem tất cả chợ
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {relatedItems.map((relItem) => (
              <MarketplaceCard key={relItem.id} item={relItem} />
            ))}
          </div>
        </section>
      )}

      {/* 4. Lightbox Modal for Full-Resolution Image Preview */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setIsZoomOpen(false)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
            <span className="text-white text-xs font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              {selectedImageIndex + 1} / {images.length}
            </span>
            <button
              onClick={() => setIsZoomOpen(false)}
              className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition cursor-pointer"
              title="Đóng"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative max-w-4xl max-h-[80vh] w-full flex items-center justify-center">
            <img
              src={images[selectedImageIndex]}
              alt={item.name}
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-md transition cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-md transition cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnail Strip in Lightbox */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 mt-4 z-50 overflow-x-auto max-w-full pb-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(i);
                  }}
                  className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition ${
                    selectedImageIndex === i ? 'border-amber-400 scale-105' : 'border-white/30 opacity-60'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Report Modal */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetTitle={`Món đồ: ${item.name}`}
        targetId={item.id}
      />

      {/* 6. Edit Marketplace Item Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Chỉnh Sửa Tin: ${item.name}`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 text-left">
          <Input
            label="Tên món đồ / Sản phẩm"
            required
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Ví dụ: Bàn học gấp gọn sinh viên, Nồi cơm điện Sharp..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 text-left">
              <label className="block text-sm font-medium text-gray-700">Danh mục</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#006d37]"
              >
                <option value="Nội thất">Nội thất</option>
                <option value="Đồ điện tử">Đồ điện tử</option>
                <option value="Sách vở">Sách vở</option>
                <option value="Đồ gia dụng">Đồ gia dụng</option>
              </select>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-sm font-medium text-gray-700">Hình thức</label>
              <select
                value={editPricingType}
                onChange={(e) => setEditPricingType(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#006d37]"
              >
                <option value="Giá rẻ">Thanh lý có phí (Giá rẻ)</option>
                <option value="Miễn phí">Tặng miễn phí (0 đồng)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {editPricingType === 'Giá rẻ' ? (
              <Input
                label="Mức giá bán (VNĐ)"
                type="number"
                required
                min={0}
                step={10000}
                value={editPrice}
                onChange={(e) => setEditPrice(Number(e.target.value))}
                placeholder="150000 (Nhập 0 nếu là giá thỏa thuận)"
              />
            ) : (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Món đồ tặng miễn phí cho sinh viên (0đ)
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <label className="block text-sm font-medium text-gray-700">Trạng thái tin đăng</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#006d37]"
              >
                <option value="Còn hàng">🟢 Còn hàng (Đang mở bán/tặng)</option>
                <option value="Đã bán">🔴 Đã bán (Đã đóng tin)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 text-left">
              <label className="block text-sm font-medium text-gray-700">Tình trạng đồ</label>
              <select
                value={editCondition}
                onChange={(e) => setEditCondition(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#006d37]"
              >
                <option value="Mới 99%">Mới 99%</option>
                <option value="Còn dùng tốt">Còn dùng tốt</option>
                <option value="Dùng tốt">Dùng tốt</option>
                <option value="Đã qua sử dụng">Đã qua sử dụng</option>
                <option value="Tặng miễn phí">Tặng miễn phí</option>
              </select>
            </div>
            <Input
              label="Địa chỉ lấy đồ"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              placeholder="Quận Cầu Giấy, Hà Nội"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-sm font-medium text-gray-700">Mô tả chi tiết</label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Thông tin chi tiết về sản phẩm, tình trạng, phụ kiện đi kèm..."
              className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#006d37]"
            />
          </div>

          {/* Cloudinary Image Uploader với tính năng sắp xếp ảnh */}
          <div className="pt-1">
            <ImageUploader
              folder="troxinh/marketplace"
              maxFiles={5}
              label="Hình ảnh sản phẩm thực tế"
              helperText="Tối đa 5 ảnh. Ảnh đầu tiên làm ảnh bìa. Dùng nút mũi tên hoặc kéo thả để đổi thứ tự."
              onComplete={(urls) => setEditImages(urls)}
              existingUrls={editImages}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="outline" size="md" type="button" onClick={() => setIsEditModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="md" type="submit" disabled={isSavingEdit}>
              {isSavingEdit ? 'Đang Lưu...' : 'Lưu Thay Đổi'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};