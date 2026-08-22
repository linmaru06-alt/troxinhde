import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { MarketplaceCard } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ShoppingBag, PlusCircle, Sparkles, Tag, Gift } from 'lucide-react';

import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ImageUploader } from '../components/ui/ImageUploader';

export const MarketplaceListPage: React.FC = () => {
  const navigate = useNavigate();
  const { marketplaceItems, currentUser, addMarketplaceItem, showToast } = useAppStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [selectedPricing, setSelectedPricing] = useState<string>('Tất cả');

  // Create Item Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [price, setPrice] = useState<number>(150000);
  const [pricingType, setPricingType] = useState<'Giá rẻ' | 'Miễn phí'>('Giá rẻ');
  const [category, setCategory] = useState<'Nội thất' | 'Đồ điện tử' | 'Sách vở' | 'Đồ gia dụng'>('Nội thất');
  const [condition, setCondition] = useState<'Mới 99%' | 'Còn dùng tốt' | 'Đã qua sử dụng' | 'Dùng tốt' | 'Tặng miễn phí'>('Còn dùng tốt');
  const [location, setLocation] = useState<string>('Số 18 Ngõ 165 Cầu Giấy, Hà Nội');
  const [district, setDistrict] = useState<string>('Quận Cầu Giấy');
  const [description, setDescription] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);

  const categories = ['Tất cả', 'Nội thất', 'Đồ điện tử', 'Sách vở', 'Đồ gia dụng'];

  const filteredItems = useMemo(() => {
    return marketplaceItems.filter((item) => {
      if (selectedCategory !== 'Tất cả' && item.category !== selectedCategory) return false;
      if (selectedPricing === 'Miễn phí' && item.pricingType !== 'Miễn phí') return false;
      if (selectedPricing === 'Giá rẻ' && item.pricingType !== 'Giá rẻ') return false;
      return true;
    });
  }, [marketplaceItems, selectedCategory, selectedPricing]);

  const handlePostItem = () => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để đăng tin thanh lý đồ cũ', 'warning');
      navigate('/dang-nhap?next=/cho-do-cu');
      return;
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Vui lòng nhập tên món đồ', '', 'warning');
      return;
    }

    addMarketplaceItem({
      userId: currentUser?.id || 'user_1',
      userName: currentUser?.name || 'Người dùng Trọ Xinh',
      userPhone: currentUser?.phone || '0987654321',
      userAvatar: currentUser?.avatarUrl || '/images/user-avatar.jpg',
      name: title,
      price: pricingType === 'Miễn phí' ? 0 : Number(price),
      pricingType,
      category,
      condition,
      location,
      district,
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'],
      description: description || 'Đồ thanh lý sinh viên chính chủ.',
    });

    setIsModalOpen(false);
    setTitle('');
    setDescription('');
    setImages([]);
    showToast('Đăng tin đồ cũ thành công! 🎉', 'Món đồ của bạn đã xuất hiện trên chợ sinh viên.', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-amber-800 via-[#904d00] to-amber-700 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-xs">
            <ShoppingBag className="w-4 h-4" />
            <span>Chợ Sinh Viên Sang Nhượng & Tặng Đồ</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Chợ Đồ Cũ Sinh Viên - Tiết Kiệm Tối Đa
          </h1>
          <p className="text-amber-100 text-xs sm:text-sm leading-relaxed">
            Mua bán bàn ghế, tủ lạnh, quạt, giáo trình giá rẻ từ các anh chị khóa trên hoặc nhận đồ tặng 0 đồng.
          </p>
        </div>

        <Button
          variant="secondary"
          size="lg"
          onClick={handlePostItem}
          leftIcon={<PlusCircle className="w-5 h-5" />}
        >
          Đăng Món Đồ Mới
        </Button>
      </div>

      {/* Category Pills & Pricing Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[#006d37] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Pricing Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedPricing(selectedPricing === 'Miễn phí' ? 'Tất cả' : 'Miễn phí')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              selectedPricing === 'Miễn phí'
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Chỉ đồ tặng 0đ</span>
          </button>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon="market"
          title="Chưa có món đồ nào trong danh mục này"
          description="Hãy thử chọn lại danh mục hoặc đăng thanh lý món đồ đầu tiên của bạn nhé!"
          actionText="Đăng đồ thanh lý ngay"
          onAction={handlePostItem}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredItems.map((item) => (
            <MarketplaceCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Post Item Modal with Real Cloudinary Image Uploader */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Đăng Món Đồ Thanh Lý / Tặng 0đ"
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <Input
            label="Tên món đồ / Sản phẩm"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Bàn học gấp gọn sinh viên, Nồi cơm điện..."
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
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="150000"
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
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thông tin chi tiết về sản phẩm, lý do pass..."
              className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-[#006d37]"
            />
          </div>

          {/* Cloudinary Image Uploader */}
          <div className="pt-1">
            <ImageUploader
              folder="troxinh/marketplace"
              maxFiles={5}
              label="Ảnh sản phẩm thực tế"
              helperText="Tối đa 5 ảnh. Chụp rõ tình trạng thật của đồ"
              onComplete={(urls) => setImages(urls)}
              existingUrls={images}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="outline" size="md" type="button" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="md" type="submit">
              Đăng Tin Ngay
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
