// =====================================================================
// K23 PMS — PHASE 4: SIÊU HỆ SINH THÁI THÔNG MINH
// P3-02: Zalo ZNS Tự Động Qua Zalo OA Tích Xanh Modal
// =====================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Send,
  Sparkles,
  Smartphone,
  CreditCard,
  QrCode,
  History,
  Clock,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatCurrency } from '../../ui/Cards';
import { K23ZnsPayload, K23ZnsMessage, ZnsTemplateType, ZNS_PRICING } from '../../../types/k23Zns';
import { buildZnsMessage, sendZnsMessage, getZnsHistory } from '../../../lib/api/k23Zns';

interface ZnsNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPayload?: Partial<K23ZnsPayload>;
}

export const ZnsNotificationModal: React.FC<ZnsNotificationModalProps> = ({
  isOpen,
  onClose,
  defaultPayload,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ZnsTemplateType>('bill_notice');
  const [history, setHistory] = useState<K23ZnsMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  // Form payload
  const [tenantName, setTenantName] = useState(defaultPayload?.tenantName || 'Lê Hoàng Nam');
  const [tenantPhone, setTenantPhone] = useState(defaultPayload?.tenantPhone || '0988123456');
  const [roomNumber, setRoomNumber] = useState(defaultPayload?.roomNumber || 'P.101');
  const [buildingName, setBuildingName] = useState(defaultPayload?.buildingName || 'Tòa Nhà Xanh Trọ Xinh');
  const [totalAmount, setTotalAmount] = useState<number>(defaultPayload?.totalAmount || 3620000);
  const [dueDate, setDueDate] = useState(defaultPayload?.dueDate || '05/11/2026');
  const [billingMonth, setBillingMonth] = useState(defaultPayload?.billingMonth || '11/2026');

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      setSendSuccessMessage(null);
    }
  }, [isOpen]);

  const loadHistory = async () => {
    const data = await getZnsHistory();
    setHistory(data);
  };

  if (!isOpen) return null;

  const currentPayload: K23ZnsPayload = {
    tenantName,
    tenantPhone,
    roomNumber,
    buildingName,
    billingMonth,
    totalAmount,
    dueDate,
    invoiceCode: `HD_${roomNumber.replace(/[^a-zA-Z0-9]/g, '')}_${billingMonth.replace('/', '')}`,
    viewBillUrl: 'https://troxinh.vn/tra-cuu-phong',
  };

  const previewMessage = buildZnsMessage(currentPayload, selectedTemplate);

  const handleSendZns = async () => {
    setIsSending(true);
    try {
      const res = await sendZnsMessage(currentPayload, selectedTemplate);
      if (res.success) {
        setSendSuccessMessage(
          `Đã gửi thành công tin nhắn ZNS Tích Xanh tới số ${tenantPhone}! Chi phí: 250 đ (Mã: ${res.message.trackingId})`
        );
        loadHistory();
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-700 via-sky-800 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white">
              <MessageSquare className="w-5 h-5 fill-sky-300 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 text-white px-2.5 py-0.5 rounded-full border border-white/20">
                  K23 PMS • P3-02 (Pro)
                </span>
                <span className="text-xs text-sky-200 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-300 fill-sky-300" /> Zalo OA Tích Xanh
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">
                Gửi Tin Zalo ZNS Tự Động Tích Xanh Doanh Nghiệp
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab chuyển đổi */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('send')}
            className={`pb-3 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'send'
                ? 'border-blue-600 text-blue-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Gửi Tin Nhắn Mới
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch Sử & Đối Soát ({history.length})</span>
          </button>
        </div>

        {/* Nội dung */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'send' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Cột trái: Cấu hình gửi */}
              <div className="md:col-span-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chọn Mẫu Tin Zalo ZNS Đã Được Kiểm Duyệt
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { key: 'bill_notice', label: 'Thông báo tiền phòng', desc: 'Gửi bill đầu tháng kèm QR' },
                      { key: 'debt_reminder', label: 'Nhắc nợ quá hạn', desc: 'Báo nợ gấp trước khi khóa thẻ' },
                      { key: 'payment_received', label: 'Xác nhận gạch nợ', desc: 'Biên lai sau khi SePay báo có' },
                      { key: 'move_out_settlement', label: 'Tất toán hoàn cọc', desc: 'Bảng cấn trừ khi trả phòng' },
                    ].map((tpl) => (
                      <button
                        key={tpl.key}
                        type="button"
                        onClick={() => setSelectedTemplate(tpl.key as ZnsTemplateType)}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                          selectedTemplate === tpl.key
                            ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="text-xs font-black text-slate-900">{tpl.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{tpl.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Tên khách</label>
                      <input
                        type="text"
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Số điện thoại Zalo</label>
                      <input
                        type="text"
                        value={tenantPhone}
                        onChange={(e) => setTenantPhone(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Số phòng</label>
                      <input
                        type="text"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Tổng tiền (VNĐ)</label>
                      <input
                        type="number"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(Number(e.target.value))}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Kỳ thanh toán</label>
                      <input
                        type="text"
                        value={billingMonth}
                        onChange={(e) => setBillingMonth(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Hạn chót</label>
                      <input
                        type="text"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Phí gửi ZNS */}
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-amber-950">Chi phí gửi tin ZNS Tích Xanh</div>
                    <div className="text-[11px] text-amber-800">
                      Gửi thẳng qua số điện thoại không cần khách follow OA trước
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-amber-950">250 đ / tin</div>
                    <div className="text-[10px] text-emerald-700 font-bold">✓ Tích xanh Trọ Xinh</div>
                  </div>
                </div>

                {sendSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{sendSuccessMessage}</span>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="md"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  onClick={handleSendZns}
                  disabled={isSending}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  {isSending ? 'Đang gửi qua Zalo Cloud...' : `Bấm Gửi ZNS Tích Xanh (250 đ)`}
                </Button>
              </div>

              {/* Cột phải: Mô phỏng điện thoại người dùng nhận tin Zalo */}
              <div className="md:col-span-6 flex flex-col items-center">
                <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>Mô Phỏng Giao Diện Khách Thuê Nhận Tin Trên App Zalo</span>
                </div>

                {/* Khung điện thoại */}
                <div className="w-full max-w-[340px] bg-slate-900 rounded-[36px] p-3 shadow-2xl border-4 border-slate-800">
                  {/* Loa thoại / Tai thỏ */}
                  <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3" />

                  {/* Màn hình Zalo */}
                  <div className="bg-[#ededed] rounded-[24px] p-3 text-slate-900 space-y-3 min-h-[420px] flex flex-col justify-between text-xs">
                    {/* Header tin nhắn Zalo OA */}
                    <div className="bg-white p-3 rounded-2xl shadow-xs space-y-2 border border-slate-100">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                        <img
                          src={ZNS_PRICING.OA_AVATAR}
                          alt="OA"
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/30"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-black text-xs text-slate-900 truncate">
                              {ZNS_PRICING.OA_NAME}
                            </span>
                            <span className="inline-flex items-center justify-center w-3.5 h-3.5 bg-blue-500 text-white rounded-full text-[8px] font-bold">
                              ✓
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">Doanh nghiệp đã xác thực</span>
                        </div>
                      </div>

                      <div className="text-xs font-black text-blue-900 pt-1">
                        {previewMessage.previewContent.title}
                      </div>

                      <div className="space-y-1.5 text-[11px] pt-1">
                        {previewMessage.previewContent.fields.map((f, i) => (
                          <div key={i} className="flex justify-between items-center py-0.5 border-b border-slate-50">
                            <span className="text-slate-500">{f.label}:</span>
                            <span className="font-bold text-slate-900">{f.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Nút CTA hành động trong tin nhắn */}
                      <div className="pt-2 space-y-1.5">
                        <button
                          type="button"
                          className="w-full py-2 bg-blue-600 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Thanh toán VietQR 1-chạm</span>
                        </button>
                        <button
                          type="button"
                          className="w-full py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5"
                        >
                          <span>Tra cứu chi tiết hóa đơn</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-center text-[10px] text-slate-400">
                      Tin nhắn tự động từ Trọ Xinh PMS
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Tab Lịch sử gửi tin ZNS */
            <div className="space-y-3">
              <div className="text-xs text-slate-500 mb-2">
                Danh sách tin nhắn ZNS đã gửi kèm báo cáo đối soát trạng thái gửi tới điện thoại khách thuê:
              </div>

              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">{item.recipientName}</span>
                      <span className="font-mono text-slate-500">({item.recipientPhone})</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã gửi thành công
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      {item.roomNumber} - {item.buildingName} • Mã theo dõi: <span className="font-mono font-bold text-slate-800">{item.trackingId}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(item.sentAt).toLocaleString('vi-VN')}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-slate-900">{item.priceVnd} đ</div>
                    <div className="text-[10px] text-slate-500">Đối soát tháng</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
