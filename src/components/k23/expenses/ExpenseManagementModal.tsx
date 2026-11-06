import React, { useState, useMemo } from 'react';
import {
  X,
  Receipt,
  DollarSign,
  TrendingUp,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  PieChart,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatPrice } from '../../ui/Cards';
import { K23Expense } from '../../../types/k23Operations';
import { useK23Operations } from '../../../hooks/queries/useK23Operations';
import { useAppStore } from '../../../store/useAppStore';

interface ExpenseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalRevenueCollected?: number; // Truyền từ màn hình hóa đơn hoặc tính tổng
}

export const ExpenseManagementModal: React.FC<ExpenseManagementModalProps> = ({
  isOpen,
  onClose,
  totalRevenueCollected = 35200000, // Giá trị mặc định hoặc truyền vào
}) => {
  const { currentUser, buildings } = useAppStore();
  const ownerId = currentUser?.id || 'user_owner_1';

  const { expenses, createExpense, deleteExpense, calculateNetProfit } = useK23Operations();

  const [isAddMode, setIsAddMode] = useState<boolean>(false);

  // Form thêm khoản chi
  const todayStr = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<K23Expense['category']>('utilities');
  const [expenseDate, setExpenseDate] = useState<string>(todayStr);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(buildings[0]?.id || 'bld_1');

  // Tính toán Lãi ròng
  const metrics = useMemo(() => {
    return calculateNetProfit(totalRevenueCollected, expenses);
  }, [totalRevenueCollected, expenses, calculateNetProfit]);

  if (!isOpen) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) return;

    const b = buildings.find((bld) => bld.id === selectedBuildingId);

    const categoryNames: Record<string, string> = {
      utilities: 'Internet & Điện nước chung',
      cleaning: 'Vệ sinh & Rác thải',
      repair: 'Sửa chữa bảo dưỡng',
      management: 'Lương quản lý / Bảo vệ',
      other: 'Chi phí khác',
    };

    await createExpense({
      owner_id: ownerId,
      building_id: selectedBuildingId,
      building_name: b?.name || 'Tòa nhà',
      category,
      category_name: categoryNames[category] || 'Khác',
      title: title.trim(),
      amount,
      expense_date: expenseDate,
    });

    setTitle('');
    setAmount(0);
    setIsAddMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <TrendingUp className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Sổ Quỹ Vận Hành & Lợi Nhuận Ròng</h3>
              <p className="text-xs text-teal-100/90">
                P1-03 • Tự động tính lãi ròng: Doanh thu thực thu − Chi phí vận hành
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Thẻ Chỉ số Lãi ròng (Net Profit Dashboard) */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block uppercase">
              1. Thực thu tiền phòng
            </span>
            <span className="text-lg font-black text-slate-900 mt-1 block">
              {formatPrice(metrics.totalRevenueCollected)}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">
              Tiền phòng đã về tài khoản
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs">
            <span className="text-[11px] font-bold text-rose-700 block uppercase">
              2. Chi phí vận hành
            </span>
            <span className="text-lg font-black text-rose-600 mt-1 block">
              −{formatPrice(metrics.totalExpenses)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              {expenses.length} khoản chi trong kỳ
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-700 text-white shadow-md">
            <span className="text-[11px] font-bold text-emerald-200 block uppercase flex items-center justify-between">
              <span>3. LỢI NHUẬN RÒNG</span>
              <span className="text-xs font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
                {metrics.profitMarginPercent}%
              </span>
            </span>
            <span className="text-xl font-black text-white mt-1 block tracking-tight">
              {formatPrice(metrics.netProfit)}
            </span>
            <span className="text-[11px] text-emerald-100 font-medium mt-0.5 block">
              Tiền lãi bỏ túi thực tế
            </span>
          </div>
        </div>

        {/* Nội dung danh sách chi phí */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Nhật ký các khoản chi vận hành
            </h4>
            <Button
              variant="primary"
              onClick={() => setIsAddMode(!isAddMode)}
              className="bg-teal-700 hover:bg-teal-800 text-xs font-bold shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              {isAddMode ? 'Đóng form' : 'Ghi nhận khoản chi'}
            </Button>
          </div>

          {/* Form thêm khoản chi mới */}
          {isAddMode && (
            <form onSubmit={handleAddSubmit} className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-4">
              <h5 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Ghi nhận khoản chi phí vận hành mới
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cơ sở / Tòa nhà</label>
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Danh mục chi</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                  >
                    <option value="utilities">Internet & Điện nước chung</option>
                    <option value="cleaning">Vệ sinh & Rác thải</option>
                    <option value="repair">Sửa chữa hỏng hóc</option>
                    <option value="management">Lương bảo vệ / Quản lý</option>
                    <option value="other">Khoản chi khác</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ngày chi</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nội dung chi</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Tiền cước cáp quang tháng 11, Thay máy bơm nước..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số tiền chi (VNĐ)</label>
                  <input
                    type="number"
                    step="10000"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="500000"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="outline" type="button" onClick={() => setIsAddMode(false)} className="text-xs">
                  Hủy
                </Button>
                <Button variant="primary" type="submit" className="bg-teal-700 hover:bg-teal-800 text-xs font-bold">
                  Lưu vào sổ quỹ
                </Button>
              </div>
            </form>
          )}

          {/* Danh sách khoản chi */}
          {expenses.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">Chưa ghi nhận khoản chi nào</p>
              <p className="text-xs">Hãy ghi nhận tiền rác, internet, sửa chữa để tính lãi ròng chính xác</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
              {expenses.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{item.title}</div>
                    <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                      <span>{item.expense_date}</span>
                      <span>•</span>
                      <span className="font-semibold text-teal-700">{item.category_name || item.category}</span>
                      {item.building_name && <span>• {item.building_name}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-black text-rose-600 text-sm font-mono">
                      −{formatPrice(item.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Xóa khoản chi "${item.title}"?`)) {
                          deleteExpense(item.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Xóa khoản chi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

