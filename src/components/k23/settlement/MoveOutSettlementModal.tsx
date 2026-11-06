import React, { useState, useMemo } from 'react';
import {
  X,
  Archive,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Zap,
  Droplet,
  Trash2,
  Plus,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Printer,
  Share2,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatPrice } from '../../ui/Cards';
import { K23Contract } from '../../../types/k23Tenants';
import { RoomAssetItem } from '../../../types/k23Settlement';

interface MoveOutSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: K23Contract | null;
  onConfirmSettlement: (result: {
    contractId: string;
    roomId: string;
    netRefundAmount: number;
    settlementDetails: any;
  }) => Promise<any>;
  onPostToMarketplace?: (roomId: string) => void;
}

const DEFAULT_ASSETS: RoomAssetItem[] = [
  { id: '1', name: 'Điều hòa & Điều khiển', initialCondition: 'Hoạt động tốt', returnCondition: 'good', damageFee: 0 },
  { id: '2', name: 'Bình nóng lạnh', initialCondition: 'Hoạt động tốt', returnCondition: 'good', damageFee: 0 },
  { id: '3', name: 'Tủ lạnh mini', initialCondition: 'Làm lạnh bình thường', returnCondition: 'good', damageFee: 0 },
  { id: '4', name: 'Chìa khóa phòng & Thẻ từ cổng', initialCondition: 'Đủ 2 bộ', returnCondition: 'good', damageFee: 0 },
  { id: '5', name: 'Giường, đệm & tủ quần áo', initialCondition: 'Không hư hỏng', returnCondition: 'good', damageFee: 0 },
];

export const MoveOutSettlementModal: React.FC<MoveOutSettlementModalProps> = ({
  isOpen,
  onClose,
  contract,
  onConfirmSettlement,
  onPostToMarketplace,
}) => {
  if (!isOpen || !contract) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const [moveOutDate, setMoveOutDate] = useState<string>(todayStr);

  // Danh mục thiết bị kiểm kê
  const [assets, setAssets] = useState<RoomAssetItem[]>(DEFAULT_ASSETS);

  // Số liệu chốt điện nước lẻ ngày
  const [electricKwh, setElectricKwh] = useState<number>(15);
  const [electricRate, setElectricRate] = useState<number>(3800);
  const [waterFee, setWaterFee] = useState<number>(50000);

  // Phí phát sinh
  const [cleaningFee, setCleaningFee] = useState<number>(150000);
  const [accumulatedDebt, setAccumulatedDebt] = useState<number>(0);
  const [otherDeduction, setOtherDeduction] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Tính toán tổng các khoản
  const depositHolding = contract.deposit_amount || 0;
  const electricCost = electricKwh * electricRate;

  const totalAssetDamage = useMemo(() => {
    return assets.reduce((sum, a) => sum + (a.returnCondition !== 'good' ? a.damageFee || 0 : 0), 0);
  }, [assets]);

  const totalDeductions = accumulatedDebt + electricCost + waterFee + totalAssetDamage + cleaningFee + otherDeduction;
  const netRefundAmount = depositHolding - totalDeductions;
  const isRefundToTenant = netRefundAmount >= 0;

  const handleAssetConditionChange = (id: string, condition: 'good' | 'damaged' | 'missing', fee?: number) => {
    setAssets((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const autoFee = fee !== undefined ? fee : condition === 'missing' ? 200000 : condition === 'damaged' ? 150000 : 0;
          return { ...item, returnCondition: condition, damageFee: autoFee };
        }
        return item;
      })
    );
  };

  const handleAddCustomAsset = () => {
    const newId = `asset_${Date.now()}`;
    setAssets((prev) => [
      ...prev,
      {
        id: newId,
        name: 'Thiết bị bổ sung...',
        initialCondition: 'Bình thường',
        returnCondition: 'good',
        damageFee: 0,
      },
    ]);
  };

  const handleConfirm = async () => {
    if (!window.confirm(`Xác nhận tất toán trả phòng ${contract.room?.room_number || ''}? Hợp đồng sẽ kết thúc và phòng sẽ trở về trạng thái Còn trống.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmSettlement({
        contractId: contract.id,
        roomId: contract.room_id,
        netRefundAmount,
        settlementDetails: {
          moveOutDate,
          depositHolding,
          accumulatedDebt,
          electricCost,
          waterFee,
          totalAssetDamage,
          cleaningFee,
          otherDeduction,
          netRefundAmount,
          assets,
        },
      });
      setIsSuccess(true);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi thanh lý hợp đồng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Archive className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Tất Toán Trả Phòng & Khấu Trừ Cọc</h3>
              <p className="text-xs text-slate-300">
                P1-01 • Phòng {contract.room?.room_number || ''} — Khách: {contract.tenant?.full_name || 'Khách'}
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

        {/* Nội dung thanh lý thành công */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h4 className="text-xl font-black text-slate-900">Tất Toán Phòng Thành Công!</h4>
              <p className="text-sm text-slate-600 mt-1">
                Hợp đồng #{contract.contract_code} đã được thanh lý. Phòng {contract.room?.room_number} đã trở lại trạng thái <strong>Còn trống</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 inline-block text-left w-full max-w-md text-sm">
              <div className="flex justify-between py-1 text-slate-600">
                <span>Tiền cọc ban đầu:</span>
                <span className="font-semibold">{formatPrice(depositHolding)}</span>
              </div>
              <div className="flex justify-between py-1 text-rose-600">
                <span>Tổng các khoản trừ:</span>
                <span className="font-semibold">−{formatPrice(totalDeductions)}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-slate-200 font-bold text-base">
                <span>{isRefundToTenant ? 'Hoàn lại cho khách:' : 'Khách thanh toán thêm:'}</span>
                <span className={isRefundToTenant ? 'text-emerald-700' : 'text-rose-700'}>
                  {formatPrice(Math.abs(netRefundAmount))}
                </span>
              </div>
            </div>

            {/* P1-10: VŨ KHÍ ĐỘC QUYỀN - Đẩy phòng trống lên Sàn Trọ Xinh */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 text-left space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Phòng đã trống! Đăng tin lên Sàn Trọ Xinh để đón khách mới ngay?</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Hệ thống tự động sử dụng hình ảnh, giá thuê {formatPrice(contract.rent_amount)} và thông tin có sẵn của phòng để tạo tin đăng tiếp cận hơn 50.000 sinh viên tại Hà Nội.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <Button
                  variant="primary"
                  onClick={() => {
                    if (onPostToMarketplace) onPostToMarketplace(contract.room_id);
                    onClose();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs shadow-md"
                >
                  Đăng tin lên Sàn Trọ Xinh ngay
                </Button>
                <Button variant="outline" onClick={onClose} className="text-xs">
                  Để sau
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Form tất toán 3 phần */
          <div className="p-6 overflow-y-auto space-y-6">
            {/* 1. Ngày dọn đi & Nợ cũ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Ngày khách dọn ra (Bàn giao chìa khóa)
                </label>
                <input
                  type="date"
                  value={moveOutDate}
                  onChange={(e) => setMoveOutDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Tiền nợ cũ các kỳ trước (nếu có)
                </label>
                <input
                  type="number"
                  value={accumulatedDebt || ''}
                  onChange={(e) => setAccumulatedDebt(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            {/* 2. Điện nước lẻ ngày */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                Điện nước chốt tại thời điểm trả phòng
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block mb-1">Số điện lẻ (kWh)</span>
                  <input
                    type="number"
                    value={electricKwh || ''}
                    onChange={(e) => setElectricKwh(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <span className="text-slate-500 font-medium block mb-1">Đơn giá điện (đ/kWh)</span>
                  <input
                    type="number"
                    value={electricRate || ''}
                    onChange={(e) => setElectricRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <span className="text-slate-500 font-medium block mb-1">Tiền nước ngày lẻ</span>
                  <input
                    type="number"
                    value={waterFee || ''}
                    onChange={(e) => setWaterFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 3. Kiểm kê trang thiết bị & Phạt hư hại */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Kiểm kê đồ đạc & Trang thiết bị phòng
                </h4>
                <button
                  type="button"
                  onClick={handleAddCustomAsset}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm thiết bị
                </button>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {assets.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex-1 min-w-[160px]">
                      <div className="font-bold text-slate-800">{item.name}</div>
                      <span className="text-[11px] text-slate-400">{item.initialCondition}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAssetConditionChange(item.id, 'good')}
                        className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
                          item.returnCondition === 'good'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tốt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAssetConditionChange(item.id, 'damaged')}
                        className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
                          item.returnCondition === 'damaged'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Hỏng
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAssetConditionChange(item.id, 'missing')}
                        className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
                          item.returnCondition === 'missing'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Mất
                      </button>
                    </div>

                    {item.returnCondition !== 'good' && (
                      <div className="flex items-center gap-1 w-28">
                        <span className="text-[10px] text-slate-400">Phạt:</span>
                        <input
                          type="number"
                          step="10000"
                          value={item.damageFee || ''}
                          onChange={(e) =>
                            handleAssetConditionChange(item.id, item.returnCondition, parseFloat(e.target.value) || 0)
                          }
                          className="w-full text-right font-bold text-rose-600 px-2 py-0.5 border rounded-lg bg-rose-50"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Phí vệ sinh & Khấu trừ khác */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Phí vệ sinh phòng dọn ra</label>
                <input
                  type="number"
                  value={cleaningFee || ''}
                  onChange={(e) => setCleaningFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Khoản trừ phát sinh khác</label>
                <input
                  type="number"
                  value={otherDeduction || ''}
                  onChange={(e) => setOtherDeduction(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>
            </div>

            {/* 5. Bảng cân đối thanh toán cọc */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Tiền cọc ban đầu đang giữ:</span>
                <span className="font-bold text-white text-sm">{formatPrice(depositHolding)}</span>
              </div>
              <div className="flex justify-between items-center text-rose-300">
                <span>Tổng chi phí khấu trừ (Điện + Nước + Đồ hỏng + Vệ sinh):</span>
                <span className="font-bold text-sm">−{formatPrice(totalDeductions)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-black">
                <span className="text-emerald-400">
                  {isRefundToTenant ? 'SỐ TIỀN HOÀN LẠI CHO KHÁCH:' : 'KHÁCH CẦN NỘP THÊM:'}
                </span>
                <span className={`text-xl ${isRefundToTenant ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatPrice(Math.abs(netRefundAmount))}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md shadow-emerald-700/20"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận thanh lý & Trả phòng'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

