import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { MarketplaceCard } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ShoppingBag, PlusCircle, Sparkles, Tag, Gift } from 'lucide-react';

export const MarketplaceListPage: React.FC = () => {
  const navigate = useNavigate();
  const { marketplaceItems, currentUser, showToast } = useAppStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [selectedPricing, setSelectedPricing] = useState<string>('Tất cả');

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
    showToast('Mở form đăng tin thanh lý đồ cũ', '', 'info');
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
    </div>
  );
};
