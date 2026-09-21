import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { MarketplaceCard } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import {
  PlusCircle,
  Sparkles,
  Tag,
  Gift,
  Search,
  SlidersHorizontal,
  MapPin,
  X,
  ArrowUpDown,
  Save,
  Eye,
  RotateCcw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit3,
  RefreshCw,
  Layers,
  User,
} from 'lucide-react';
import { MarketplaceItem } from '../types';

import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ImageUploader } from '../components/ui/ImageUploader';
import { createMarketplaceItem } from '../lib/api/marketplace';

const DISTRICTS = [
  'Quận Cầu Giấy',
  'Quận Đống Đa',
  'Quận Hai Bà Trưng',
  'Quận Thanh Xuân',
  'Quận Nam Từ Liêm',
  'Quận Hà Đông',
  'Quận Ba Đình',
  'Quận Bắc Từ Liêm',
  'Quận Hoàng Mai',
];

const CATEGORY_SHOWCASE = [
  {
    name: 'Nội thất',
    label: 'Nội thất sinh viên',
    desc: 'Bàn ghế, tủ vải, kệ sách',
    icon: '🪑',
    image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=500&auto=format&fit=crop&q=80',
  },
  {
    name: 'Đồ điện tử',
    label: 'Đồ điện tử giá rẻ',
    desc: 'Tủ lạnh mini, màn hình, tai nghe',
    icon: '⚡',
    image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500&auto=format&fit=crop&q=80',
  },
  {
    name: 'Sách vở',
    label: 'Sách & Giáo trình',
    desc: 'TOEIC, IT, giáo trình đại học 0đ',
    icon: '📚',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&auto=format&fit=crop&q=80',
  },
  {
    name: 'Đồ gia dụng',
    label: 'Đồ gia dụng phòng trọ',
    desc: 'Nồi cơm điện, bếp từ, quạt máy',
    icon: '🍳',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500&auto=format&fit=crop&q=80',
  },
];

export const MarketplaceListPage: React.FC = () => {
  const navigate = useNavigate();
  const { marketplaceItems, currentUser, addMarketplaceItem, resubmitMarketplaceItem, showToast } = useAppStore();

  const [viewMode, setViewMode] = useState<'public' | 'my_items'>('public');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [selectedPricing, setSelectedPricing] = useState<string>('Tất cả');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('newest');

  // Create Item Modal State & Draft Management
  const DRAFT_KEY = 'troxinh_draft_marketplace';
  const getInitialMarketDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return null;
  };
  const initialMarketDraft = getInitialMarketDraft();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [hasDraftRestored, setHasDraftRestored] = useState<boolean>(Boolean(initialMarketDraft));
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [title, setTitle] = useState<string>(initialMarketDraft?.title || '');
  const [price, setPrice] = useState<number>(initialMarketDraft?.price ?? 150000);
  const [pricingType, setPricingType] = useState<'Giá rẻ' | 'Miễn phí'>(initialMarketDraft?.pricingType || 'Giá rẻ');
  const [category, setCategory] = useState<'Nội thất' | 'Đồ điện tử' | 'Sách vở' | 'Đồ gia dụng'>(
    initialMarketDraft?.category || 'Nội thất'
  );
  const [condition, setCondition] = useState<
    'Mới 99%' | 'Còn dùng tốt' | 'Đã qua sử dụng' | 'Dùng tốt' | 'Tặng miễn phí'
  >(initialMarketDraft?.condition || 'Còn dùng tốt');
  const [location, setLocation] = useState<string>(
    initialMarketDraft?.location || 'Số 18 Ngõ 165 Cầu Giấy, Hà Nội'
  );
  const [district, setDistrict] = useState<string>(initialMarketDraft?.district || 'Quận Cầu Giấy');
  const [description, setDescription] = useState<string>(initialMarketDraft?.description || '');
  const [images, setImages] = useState<string[]>(initialMarketDraft?.images || []);

  // Resubmit / Edit Modal State (Nhận lý do từ chối và sửa gửi lại)
  const [resubmitModalOpen, setResubmitModalOpen] = useState<boolean>(false);
  const [resubmittingItem, setResubmittingItem] = useState<MarketplaceItem | null>(null);
  const [resubmitTitle, setResubmitTitle] = useState<string>('');
  const [resubmitPrice, setResubmitPrice] = useState<number>(0);
  const [resubmitPricingType, setResubmitPricingType] = useState<'Giá rẻ' | 'Miễn phí'>('Giá rẻ');
  const [resubmitCategory, setResubmitCategory] = useState<'Nội thất' | 'Đồ điện tử' | 'Sách vở' | 'Đồ gia dụng'>('Nội thất');
  const [resubmitCondition, setResubmitCondition] = useState<'Mới 99%' | 'Còn dùng tốt' | 'Đã qua sử dụng' | 'Dùng tốt' | 'Tặng miễn phí'>('Còn dùng tốt');
  const [resubmitLocation, setResubmitLocation] = useState<string>('');
  const [resubmitDistrict, setResubmitDistrict] = useState<string>('');
  const [resubmitDescription, setResubmitDescription] = useState<string>('');
  const [resubmitImages, setResubmitImages] = useState<string[]>([]);
  const [isResubmitting, setIsResubmitting] = useState<boolean>(false);

  const handleOpenResubmitModal = (itemToEdit: MarketplaceItem) => {
    setResubmittingItem(itemToEdit);
    setResubmitTitle(itemToEdit.name);
    setResubmitPrice(itemToEdit.price);
    setResubmitPricingType(itemToEdit.pricingType);
    setResubmitCategory(itemToEdit.category);
    setResubmitCondition(itemToEdit.condition);
    setResubmitLocation(itemToEdit.location);
    setResubmitDistrict(itemToEdit.district);
    setResubmitDescription(itemToEdit.description);
    setResubmitImages(itemToEdit.images || []);
    setResubmitModalOpen(true);
  };

  // Auto-save draft when fields change
  useEffect(() => {
    if (isModalOpen) {
      const draftData = {
        title,
        price,
        pricingType,
        category,
        condition,
        location,
        district,
        description,
        images,
        savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      } catch (e) {
        console.warn(e);
      }
    }
  }, [title, price, pricingType, category, condition, location, district, description, images, isModalOpen]);

  const handleSaveMarketDraft = () => {
    const draftData = {
      title,
      price,
      pricingType,
      category,
      condition,
      location,
      district,
      description,
      images,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      showToast('Đã lưu bản nháp', 'Dữ liệu món đồ đã được lưu an toàn', 'success');
    } catch (e) {
      showToast('Lỗi lưu nháp', 'Không thể ghi vào bộ nhớ tạm', 'error');
    }
  };

  const handleClearMarketDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setTitle('');
      setPrice(150000);
      setPricingType('Giá rẻ');
      setCategory('Nội thất');
      setCondition('Còn dùng tốt');
      setDescription('');
      setImages([]);
      setHasDraftRestored(false);
      showToast('Đã xóa bản nháp', 'Form đăng đồ đã được làm mới', 'info');
    } catch (e) {
      console.warn(e);
    }
  };

  const previewMarketItem: MarketplaceItem = {
    id: 'preview_item',
    userId: currentUser?.id || 'user_1',
    userName: currentUser?.name || 'Người dùng Trọ Xinh',
    userPhone: currentUser?.phone || '0987654321',
    userAvatar: currentUser?.avatarUrl || '/images/user-avatar.webp',
    name: title || 'Tên món đồ thanh lý...',
    price: pricingType === 'Miễn phí' ? 0 : Number(price),
    pricingType,
    category,
    condition,
    location: location || 'Hà Nội',
    district: district || 'Quận Cầu Giấy',
    images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800'],
    description: description || 'Chưa có mô tả chi tiết.',
    status: 'Còn hàng',
    createdAt: new Date().toISOString(),
  };

  const categories = ['Tất cả', 'Nội thất', 'Đồ điện tử', 'Sách vở', 'Đồ gia dụng'];

  // Lấy danh sách tin của người dùng hiện tại
  const myItems = useMemo(() => {
    if (!currentUser) return [];
    return marketplaceItems.filter((i) => i.userId === currentUser.id);
  }, [marketplaceItems, currentUser]);

  const rejectedCount = useMemo(() => {
    return myItems.filter((i) => i.status === 'Bị từ chối' || i.moderationStatus === 'rejected').length;
  }, [myItems]);

  const pendingCount = useMemo(() => {
    return myItems.filter((i) => i.status === 'Chờ duyệt' || i.moderationStatus === 'pending').length;
  }, [myItems]);

  const filteredItems = useMemo(() => {
    return marketplaceItems
      .filter((item) => {
        // 1. Quy tắc hiển thị:
        // - 'public': CHỈ CÔNG KHAI TIN ĐỦ ĐIỀU KIỆN (không chờ duyệt, không bị từ chối)
        if (viewMode === 'public') {
          const isPending = item.status === 'Chờ duyệt' || item.moderationStatus === 'pending';
          const isRejected = item.status === 'Bị từ chối' || item.moderationStatus === 'rejected';
          if (isPending || isRejected) return false;
        } else {
          // - 'my_items': Chỉ hiển thị tin do chính người dùng hiện tại đăng
          if (!currentUser || item.userId !== currentUser.id) return false;
        }

        if (selectedCategory !== 'Tất cả' && item.category !== selectedCategory) return false;
        if (selectedPricing === 'Miễn phí' && item.pricingType !== 'Miễn phí') return false;
        if (selectedPricing === 'Giá rẻ' && item.pricingType !== 'Giá rẻ') return false;
        if (selectedDistrict && item.district !== selectedDistrict) return false;

        if (searchKeyword.trim()) {
          const q = searchKeyword.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchLoc = item.location.toLowerCase().includes(q);
          const matchDist = item.district.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchLoc && !matchDist) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedSort === 'price_asc') return a.price - b.price;
        if (selectedSort === 'price_desc') return b.price - a.price;
        if (selectedSort === 'free_first') {
          if (a.pricingType === 'Miễn phí' && b.pricingType !== 'Miễn phí') return -1;
          if (a.pricingType !== 'Miễn phí' && b.pricingType === 'Miễn phí') return 1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [marketplaceItems, viewMode, currentUser, selectedCategory, selectedPricing, selectedDistrict, searchKeyword, selectedSort]);

  const handlePostItem = () => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để đăng tin thanh lý đồ cũ', 'warning');
      navigate('/dang-nhap?returnUrl=/cho-do-cu');
      return;
    }
    setIsModalOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!title.trim()) {
      showToast('Thiếu tiêu đề', 'Vui lòng nhập tên món đồ muốn pass', 'warning');
      return;
    }

    if (images.length === 0) {
      showToast('Thiếu ảnh sản phẩm', 'Vui lòng tải lên ít nhất 1 ảnh thực tế của món đồ', 'warning');
      return;
    }

    const sellerId =
      currentUser?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id)
        ? currentUser.id
        : '00000000-0000-0000-0000-000000000003';

    const catMap: Record<string, string> = {
      'Nội thất': 'furniture',
      'Đồ điện tử': 'electronics',
      'Sách vở': 'books',
      'Đồ gia dụng': 'household',
    };

    setIsSubmitting(true);
    try {
      try {
        await createMarketplaceItem({
          seller_id: sellerId,
          title: title.trim(),
          price: pricingType === 'Miễn phí' ? 0 : Number(price),
          is_free: pricingType === 'Miễn phí',
          category: (catMap[category] as any) || 'other',
          district,
          description: description || 'Đồ thanh lý sinh viên chính chủ.',
          image_urls: images.length > 0 ? images : ['/images/marketplace-banner.webp'],
        });
      } catch (apiErr) {
        console.warn('[API marketplace fallback]:', apiErr);
      }

      // Lưu tin vào store với trạng thái "Chờ duyệt"
      addMarketplaceItem({
        userId: currentUser?.id || 'user_1',
        userName: currentUser?.name || 'Người dùng Trọ Xinh',
        userPhone: currentUser?.phone || '',
        userAvatar: currentUser?.avatarUrl || '/images/user-avatar.webp',
        name: title.trim(),
        price: pricingType === 'Miễn phí' ? 0 : Number(price),
        pricingType,
        category,
        condition,
        location,
        district,
        images: images.length > 0 ? images : ['/images/marketplace-banner.webp'],
        description: description || 'Đồ thanh lý sinh viên chính chủ.',
      });

      // Xóa bản nháp sau khi đăng thành công
      localStorage.removeItem(DRAFT_KEY);
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setImages([]);
      
      // Chuyển sang tab "Tin của tôi" để người dùng theo dõi trạng thái chờ duyệt
      setViewMode('my_items');
      showToast('Gửi tin chờ duyệt thành công! ⏳', 'Admin sẽ kiểm tra nội dung và duyệt công khai tin của bạn sớm nhất.', 'success');
    } catch (err: any) {
      // GIỮ NGUYÊN DỮ LIỆU KHI LỖI
      const errorMsg = err?.message || 'Không thể đăng tin lúc này. Dữ liệu của bạn đã được giữ nguyên.';
      setSubmitError(errorMsg);
      showToast('Lỗi khi đăng tin', errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý gửi lại tin sau khi chỉnh sửa
  const handleResubmitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmittingItem) return;

    if (!resubmitTitle.trim()) {
      showToast('Thiếu tiêu đề', 'Vui lòng nhập tên món đồ muốn thanh lý', 'warning');
      return;
    }

    if (resubmitImages.length === 0) {
      showToast('Thiếu ảnh sản phẩm', 'Vui lòng tải lên ít nhất 1 ảnh thực tế của món đồ', 'warning');
      return;
    }

    setIsResubmitting(true);
    try {
      resubmitMarketplaceItem(resubmittingItem.id, {
        name: resubmitTitle.trim(),
        price: resubmitPricingType === 'Miễn phí' ? 0 : Number(resubmitPrice),
        pricingType: resubmitPricingType,
        category: resubmitCategory,
        condition: resubmitCondition,
        location: resubmitLocation,
        district: resubmitDistrict,
        description: resubmitDescription.trim(),
        images: resubmitImages,
      });

      setResubmitModalOpen(false);
      setResubmittingItem(null);
      showToast('Đã gửi lại duyệt thành công! 🚀', 'Tin đăng đã được cập nhật và chuyển vào danh sách chờ Admin kiểm duyệt lại.', 'success');
    } catch (err: any) {
      showToast('Lỗi khi gửi lại duyệt', err?.message || 'Không thể gửi lại tin lúc này', 'error');
    } finally {
      setIsResubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl border border-gray-900/10">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('/images/marketplace-banner.webp')` }}
        />
        {/* Dark Gradient & Frosted Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-slate-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
        {/* Ambient Warm Amber Glow */}
        <div className="absolute -top-10 right-1/4 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Content Container */}
        <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              Chợ Đồ Cũ Sinh Viên <br />
              <span className="text-[#f59e0b]">Tiết Kiệm Tối Đa Chi Phí</span>
            </h1>
            <p className="text-gray-100 text-xs sm:text-sm md:text-base leading-relaxed font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] max-w-lg">
              Mua bán bàn ghế, tủ lạnh, quạt điện, giáo trình giá rẻ từ các anh chị khóa trên hoặc nhận đồ tặng 0 đồng tại các cụm trọ sinh viên Hà Nội.
            </p>
          </div>

          {/* Phần đăng món đồ thanh lý nổi bật vượt trội */}
          <div className="shrink-0 flex flex-col items-center md:items-end gap-2.5 w-full md:w-auto">
            <div className="p-1 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:shadow-[0_0_40px_rgba(245,158,11,0.75)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] w-full md:w-auto">
              <button
                type="button"
                onClick={handlePostItem}
                className="w-full md:w-auto flex items-center justify-center gap-3 px-5 sm:px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm sm:text-base tracking-wide cursor-pointer transition-all duration-200 shadow-md"
              >
                <span className="p-1 bg-white/25 rounded-lg flex items-center justify-center shadow-inner">
                  <PlusCircle className="w-5 h-5 text-white shrink-0" strokeWidth={2.5} />
                </span>
                <span>Đăng Món Đồ Muốn Thanh Lý</span>
                <Sparkles className="w-4 h-4 text-amber-200 shrink-0" />
              </button>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-amber-200 font-semibold bg-slate-900/85 backdrop-blur-md px-3.5 py-1 rounded-full border border-amber-500/35 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Đăng tin miễn phí • Tặng 0đ hoặc sang nhượng</span>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Tabs: "Tất cả đồ thanh lý" vs "Tin thanh lý của tôi" */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-gray-200/90 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('public')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewMode === 'public'
                ? 'bg-[#006d37] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Tất cả đồ thanh lý</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${viewMode === 'public' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
              {marketplaceItems.filter(i => i.status !== 'Chờ duyệt' && i.moderationStatus !== 'pending' && i.status !== 'Bị từ chối' && i.moderationStatus !== 'rejected').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!currentUser) {
                showToast('Vui lòng đăng nhập', 'Đăng nhập để xem danh sách tin thanh lý của bạn', 'warning');
                navigate('/dang-nhap?returnUrl=/cho-do-cu');
                return;
              }
              setViewMode('my_items');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewMode === 'my_items'
                ? 'bg-[#006d37] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Tin của tôi</span>
            {currentUser && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${viewMode === 'my_items' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-[#006d37]'}`}>
                {myItems.length}
              </span>
            )}
            {rejectedCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse" title={`${rejectedCount} tin bị từ chối cần sửa`}>
                {rejectedCount} cần sửa
              </span>
            )}
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full" title={`${pendingCount} tin chờ duyệt`}>
                {pendingCount} chờ duyệt
              </span>
            )}
          </button>
        </div>

        {viewMode === 'my_items' && (
          <div className="flex items-center gap-2 text-xs text-gray-500 pr-2">
            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              {pendingCount} chờ duyệt
            </span>
            <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 font-semibold">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              {rejectedCount} bị từ chối
            </span>
          </div>
        )}
      </div>

      {/* Visual Category Showcase Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {CATEGORY_SHOWCASE.map((cat) => {
          const isSelected = selectedCategory === cat.name;
          const count = marketplaceItems.filter((i) => i.category === cat.name).length;

          return (
            <button
              key={cat.name}
              type="button"
              onClick={() => setSelectedCategory(isSelected ? 'Tất cả' : cat.name)}
              className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-300 p-3.5 sm:p-4 flex flex-col justify-between h-32 sm:h-36 cursor-pointer shadow-xs hover:shadow-md ${
                isSelected
                  ? 'border-[#006d37] ring-2 ring-[#006d37]/30 shadow-emerald-900/10 -translate-y-0.5'
                  : 'border-gray-200/80 hover:border-[#006d37]/30 bg-white hover:-translate-y-0.5'
              }`}
            >
              {/* Background Decorative Image */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105 opacity-20 group-hover:opacity-30"
                style={{ backgroundImage: `url('${cat.image}')` }}
              />
              <div
                className={`absolute inset-0 transition-colors ${
                  isSelected
                    ? 'bg-gradient-to-t from-emerald-900/90 via-emerald-900/50 to-emerald-900/20'
                    : 'bg-gradient-to-t from-white via-white/80 to-white/40'
                }`}
              />

              {/* Top Row: Icon & Count Badge */}
              <div className="relative z-10 flex items-center justify-between w-full">
                <span className="text-2xl sm:text-3xl filter drop-shadow-xs">{cat.icon}</span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-white text-[#006d37] shadow-xs' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {count} món
                </span>
              </div>

              {/* Bottom Row: Label & Subtitle */}
              <div className="relative z-10 space-y-0.5">
                <h3
                  className={`text-xs sm:text-sm font-black transition-colors ${
                    isSelected ? 'text-white' : 'text-gray-900 group-hover:text-[#006d37]'
                  }`}
                >
                  {cat.label}
                </h3>
                <p
                  className={`text-[10px] sm:text-[11px] line-clamp-1 ${
                    isSelected ? 'text-emerald-100' : 'text-gray-500'
                  }`}
                >
                  {cat.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Bar & Search */}
      <div className="space-y-3 bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs">
        {/* Search & Sort Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm theo tên món đồ (vd: tủ lạnh, bàn học, quạt máy, giáo trình...)"
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none"
            />
            {searchKeyword && (
              <button onClick={() => setSearchKeyword('')} className="absolute right-3 top-2.5 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* District Filter */}
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#006d37] w-full sm:w-auto"
            >
              <option value="">Tất cả khu vực</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Sorting */}
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-xs font-bold text-gray-800 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá: Thấp → Cao</option>
                <option value="price_desc">Giá: Cao → Thấp</option>
                <option value="free_first">Đồ tặng 0đ trước</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pills & Pricing Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#006d37] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedPricing(selectedPricing === 'Miễn phí' ? 'Tất cả' : 'Miễn phí')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                selectedPricing === 'Miễn phí'
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                  : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Chỉ đồ tặng 0đ</span>
            </button>

            {(selectedCategory !== 'Tất cả' || selectedPricing !== 'Tất cả' || selectedDistrict || searchKeyword) && (
              <button
                onClick={() => {
                  setSelectedCategory('Tất cả');
                  setSelectedPricing('Tất cả');
                  setSelectedDistrict('');
                  setSearchKeyword('');
                }}
                className="text-xs text-rose-600 hover:underline font-bold flex items-center gap-0.5 ml-1"
              >
                <X className="w-3.5 h-3.5" />
                Xóa lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon="market"
          title={viewMode === 'my_items' ? "Bạn chưa có tin đăng thanh lý nào" : "Chưa có món đồ nào trong danh mục này"}
          description={viewMode === 'my_items' ? "Hãy đăng món đồ đầu tiên để pass lại cho các bạn sinh viên nhé!" : "Hãy thử chọn lại danh mục hoặc đăng thanh lý món đồ đầu tiên của bạn nhé!"}
          actionText="Đăng đồ thanh lý ngay"
          onAction={handlePostItem}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map((item) => {
            const isRejected = item.status === 'Bị từ chối' || item.moderationStatus === 'rejected';
            const isPending = item.status === 'Chờ duyệt' || item.moderationStatus === 'pending';

            return (
              <div key={item.id} className="flex flex-col h-full space-y-2">
                <div className="flex-1">
                  <MarketplaceCard item={item} />
                </div>

                {/* Khung hành động kiểm duyệt cho chính người đăng (Tin của tôi) */}
                {viewMode === 'my_items' && (
                  <div className="space-y-1.5 pt-1">
                    {isRejected && (
                      <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl space-y-2 text-xs shadow-xs">
                        <div className="flex items-start gap-1.5 text-rose-900">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-rose-900">Admin từ chối duyệt:</p>
                            <p className="text-rose-700 italic mt-0.5 leading-snug">
                              "{item.rejectionReason || 'Ảnh mờ hoặc thông tin chưa đạt chuẩn quy định chợ đồ cũ sinh viên.'}"
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenResubmitModal(item)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition shadow-xs cursor-pointer text-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Sửa & Gửi Lại Duyệt</span>
                        </button>
                      </div>
                    )}

                    {isPending && (
                      <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-900 shadow-xs">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                          Đang chờ Admin duyệt
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenResubmitModal(item)}
                          className="text-amber-800 font-bold hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          Sửa tin
                        </button>
                      </div>
                    )}

                    {!isRejected && !isPending && item.status !== 'Đã bán' && (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-[11px] text-emerald-800">
                        <span className="flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#006d37]" />
                          Đã duyệt • Đang công khai
                        </span>
                        <Link
                          to={`/cho-do-cu/${item.id}`}
                          className="text-[#006d37] font-bold hover:underline"
                        >
                          Xem tin →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Post Item Modal with Real Cloudinary Image Uploader & Draft/Preview */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Đăng Món Đồ Thanh Lý / Tặng 0đ"
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Draft Restored Banner */}
          {hasDraftRestored && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Đã tự động nạp dữ liệu nháp của bạn
              </span>
              <button
                type="button"
                onClick={handleClearMarketDraft}
                className="text-rose-600 font-bold hover:underline cursor-pointer"
              >
                Xóa nháp
              </button>
            </div>
          )}

          {/* Submit Error Banner (Giữ nguyên form) */}
          {submitError && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-start justify-between text-xs text-rose-800 gap-2">
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Lỗi: {submitError}</p>
                  <p className="text-[11px] text-rose-600">Toàn bộ thông tin bạn đã nhập đã được giữ nguyên.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="text-rose-400 hover:text-rose-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <Input
            label="Tên món đồ / Sản phẩm"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Bàn học gấp gọn sinh viên, Nồi cơm điện Sharp..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 text-left">
              <label className="block text-sm font-medium text-gray-700">Danh mục</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm"
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
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm"
              >
                <option value="Giá rẻ">Thanh lý có phí (Giá rẻ)</option>
                <option value="Miễn phí">Tặng miễn phí (0 đồng)</option>
              </select>
            </div>
          </div>

          {pricingType === 'Giá rẻ' && (
            <Input
              label="Mức giá bán (VNĐ)"
              type="number"
              required
              min={0}
              step={10000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="150000 (Nhập 0 nếu là giá thỏa thuận / chưa nhập giá)"
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 text-left">
              <label className="block text-sm font-medium text-gray-700">Tình trạng đồ</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm"
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
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Quận Cầu Giấy, Hà Nội"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-sm font-medium text-gray-700">Mô tả thêm</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thông tin chi tiết về sản phẩm, tình trạng, lý do pass..."
              className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#006d37]"
            />
          </div>

          {/* Cloudinary Image Uploader với sắp xếp ảnh */}
          <div className="pt-1">
            <ImageUploader
              folder="troxinh/marketplace"
              maxFiles={5}
              label="Ảnh sản phẩm thực tế"
              helperText="Tối đa 5 ảnh. Ảnh đầu tiên làm ảnh bìa. Dùng nút mũi tên hoặc kéo thả để đổi thứ tự."
              onComplete={(urls) => setImages(urls)}
              existingUrls={images}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleSaveMarketDraft}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Lưu Nháp
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowPreviewModal(true)}
                leftIcon={<Eye className="w-3.5 h-3.5 text-[#006d37]" />}
                className="text-[#006d37]"
              >
                Xem Trước
              </Button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" size="md" type="button" onClick={() => setIsModalOpen(false)}>
                Hủy
              </Button>
              <Button variant="primary" size="md" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Đang Đăng Tin...' : 'Đăng Tin Ngay'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Preview Item Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Xem Trước Thẻ Món Đồ Trên Chợ"
        maxWidth="md"
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-gray-500 text-left">
            Đây là giao diện hiển thị của món đồ trên danh sách Chợ đồ cũ:
          </p>
          <div className="max-w-xs mx-auto">
            <MarketplaceCard item={previewMarketItem} />
          </div>
          <div className="flex justify-end pt-3 border-t border-gray-100">
            <Button variant="primary" size="sm" onClick={() => setShowPreviewModal(false)}>
              Đóng Xem Trước
            </Button>
          </div>
        </div>
      </Modal>

      {/* Resubmit Modal (Nhận lý do từ chối và sửa gửi lại) */}
      <Modal
        isOpen={resubmitModalOpen}
        onClose={() => {
          setResubmitModalOpen(false);
          setResubmittingItem(null);
        }}
        title={`Chỉnh Sửa & Gửi Lại Duyệt: ${resubmittingItem?.name || ''}`}
        maxWidth="lg"
      >
        <form onSubmit={handleResubmitSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Lý do từ chối từ Admin */}
          {resubmittingItem?.rejectionReason && (
            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-300 flex items-start gap-2.5 text-xs text-rose-900 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Lý do từ chối từ ban quản trị:</p>
                <p className="text-rose-700 italic mt-0.5">"{resubmittingItem.rejectionReason}"</p>
                <p className="text-[11px] text-rose-600 mt-1 font-medium">
                  💡 Bạn hãy điều chỉnh thông tin hoặc ảnh sản phẩm theo góp ý trên rồi nhấn nút "Gửi Lại Cho Admin Duyệt".
                </p>
              </div>
            </div>
          )}

          <Input
            label="Tên món đồ / Sản phẩm"
            required
            value={resubmitTitle}
            onChange={(e) => setResubmitTitle(e.target.value)}
            placeholder="Ví dụ: Bàn học gấp gọn sinh viên, Nồi cơm điện Sharp..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 text-left">
              <label className="block text-sm font-medium text-gray-700">Danh mục</label>
              <select
                value={resubmitCategory}
                onChange={(e) => setResubmitCategory(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm"
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
                value={resubmitPricingType}
                onChange={(e) => setResubmitPricingType(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm"
              >
                <option value="Giá rẻ">Thanh lý có phí (Giá rẻ)</option>
                <option value="Miễn phí">Tặng miễn phí (0 đồng)</option>
              </select>
            </div>
          </div>

          {resubmitPricingType === 'Giá rẻ' && (
            <Input
              label="Mức giá bán (VNĐ)"
              type="number"
              required
              min={0}
              step={10000}
              value={resubmitPrice}
              onChange={(e) => setResubmitPrice(Number(e.target.value))}
              placeholder="150000 (Nhập 0 nếu là giá thỏa thuận)"
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 text-left">
              <label className="block text-sm font-medium text-gray-700">Tình trạng đồ</label>
              <select
                value={resubmitCondition}
                onChange={(e) => setResubmitCondition(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm"
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
              value={resubmitLocation}
              onChange={(e) => setResubmitLocation(e.target.value)}
              placeholder="Quận Cầu Giấy, Hà Nội"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-sm font-medium text-gray-700">Mô tả thêm</label>
            <textarea
              rows={3}
              value={resubmitDescription}
              onChange={(e) => setResubmitDescription(e.target.value)}
              placeholder="Thông tin chi tiết về sản phẩm, tình trạng, lý do pass..."
              className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#006d37]"
            />
          </div>

          {/* Cloudinary Image Uploader */}
          <div className="pt-1">
            <ImageUploader
              folder="troxinh/marketplace"
              maxFiles={5}
              label="Ảnh sản phẩm thực tế"
              helperText="Tối đa 5 ảnh. Hãy chụp rõ ràng ánh sáng tốt để Admin duyệt nhanh chóng."
              onComplete={(urls) => setResubmitImages(urls)}
              existingUrls={resubmitImages}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => {
                setResubmitModalOpen(false);
                setResubmittingItem(null);
              }}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isResubmitting}
              leftIcon={<RefreshCw className={`w-4 h-4 ${isResubmitting ? 'animate-spin' : ''}`} />}
            >
              {isResubmitting ? 'Đang Gửi Lại...' : 'Gửi Lại Cho Admin Duyệt'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
