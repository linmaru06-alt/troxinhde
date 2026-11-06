import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  CreditCard,
  MapPin,
  Car,
  FileText,
  Calendar,
  ShieldCheck,
  ExternalLink,
  Clock,
  Sparkles,
  MessageCircle,
  FileCheck2,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatPrice } from '../../ui/Cards';
import { K23Tenant, K23Contract } from '../../../types/k23Tenants';

interface TenantDocumentCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: K23Tenant | null;
  contracts: K23Contract[];
  onRenewContract?: (contractId: string, months: number) => Promise<any>;
  onTerminateContract?: (contractId: string) => Promise<any>;
  onOpenZalo?: (tenant: K23Tenant) => void;
}

export const TenantDocumentCabinetModal: React.FC<TenantDocumentCabinetModalProps> = ({
  isOpen,
  onClose,
  tenant,
  contracts,
  onRenewContract,
  onTerminateContract,
  onOpenZalo,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'id_cards' | 'contracts'>('profile');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !tenant) return null;

  // Lọc các hợp đồng thuộc về khách thuê này
  const tenantContracts = contracts.filter((c) => c.tenant_id === tenant.id);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const calculateDaysLeft = (endDateStr: string) => {
    const end = new Date(endDateStr);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20 text-emerald-100 font-bold text-xl">
              {tenant.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight text-white">{tenant.full_name}</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  Khách thuê
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5 flex items-center gap-2">
                <span>SĐT: {tenant.phone}</span>
                {tenant.vehicle_plate && <span>• Xe: {tenant.vehicle_plate}</span>}
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

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex gap-4 shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            Hồ sơ lý lịch
          </button>
          <button
            onClick={() => setActiveTab('id_cards')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'id_cards'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Tủ ảnh CCCD / Giấy tờ
          </button>
          <button
            onClick={() => setActiveTab('contracts')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'contracts'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Hợp đồng & Cọc ({tenantContracts.length})
          </button>
        </div>

        {/* Nội dung tab */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Họ và tên</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-base font-bold text-slate-800">{tenant.full_name}</span>
                    <button
                      onClick={() => handleCopy(tenant.full_name, 'name')}
                      className="text-slate-400 hover:text-slate-600"
                      title="Sao chép"
                    >
                      {copiedField === 'name' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Số điện thoại</span>
                  <div className="flex items-center justify-between mt-1">
                    <a
                      href={`tel:${tenant.phone.replace(/\s+/g, '')}`}
                      className="text-base font-bold text-emerald-700 hover:underline flex items-center gap-1.5"
                    >
                      <Phone className="w-4 h-4" />
                      {tenant.phone}
                    </a>
                    <button
                      onClick={() => handleCopy(tenant.phone, 'phone')}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {copiedField === 'phone' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Số CCCD / CMND</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-base font-mono font-bold text-slate-800">
                      {tenant.id_card_number || 'Chưa cập nhật'}
                    </span>
                    {tenant.id_card_number && (
                      <button
                        onClick={() => handleCopy(tenant.id_card_number!, 'cccd')}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {copiedField === 'cccd' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày & Nơi cấp CCCD</span>
                  <span className="text-sm font-semibold text-slate-700 mt-1">
                    {tenant.id_card_date || '—'} ({tenant.id_card_place || 'Cục CS QLHC về TTXH'})
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quê quán / Thường trú</span>
                  <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-slate-700">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{tenant.hometown || 'Chưa rõ'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phương tiện / Biển số xe</span>
                  <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-slate-700">
                    <Car className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>{tenant.vehicle_plate || 'Chưa đăng ký phương tiện'}</span>
                  </div>
                </div>
              </div>

              {tenant.notes && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-4 h-4" />
                    Ghi chú từ chủ trọ
                  </h4>
                  <p className="text-sm text-amber-900">{tenant.notes}</p>
                </div>
              )}

              {/* Phím tắt liên hệ nhanh */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={`tel:${tenant.phone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
                >
                  <Phone className="w-4 h-4 text-emerald-600" />
                  Gọi điện thoại
                </a>
                <button
                  type="button"
                  onClick={() => onOpenZalo && onOpenZalo(tenant)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-sm transition-colors border border-blue-200"
                >
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                  Nhắn tin qua Zalo
                </button>
              </div>
            </div>
          )}

          {activeTab === 'id_cards' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Ảnh mặt trước */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Mặt trước CCCD</span>
                    {tenant.id_card_front_url && (
                      <a
                        href={tenant.id_card_front_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Xem ảnh gốc
                      </a>
                    )}
                  </div>
                  <div className="w-full h-52 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group relative">
                    {tenant.id_card_front_url ? (
                      <img
                        src={tenant.id_card_front_url}
                        alt="Mặt trước CCCD"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <CreditCard className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">Chưa có ảnh mặt trước</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ảnh mặt sau */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Mặt sau CCCD</span>
                    {tenant.id_card_back_url && (
                      <a
                        href={tenant.id_card_back_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Xem ảnh gốc
                      </a>
                    )}
                  </div>
                  <div className="w-full h-52 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group relative">
                    {tenant.id_card_back_url ? (
                      <img
                        src={tenant.id_card_back_url}
                        alt="Mặt sau CCCD"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <CreditCard className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">Chưa có ảnh mặt sau</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-900 leading-relaxed">
                  <strong>Tủ hồ sơ bảo mật (P0-04):</strong> Giấy tờ CCCD và bằng lái của khách thuê được lưu trữ an toàn,
                  phục vụ khai báo lưu trú tạm trú với cơ quan Công an và đối soát khi có tranh chấp hợp đồng.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="space-y-4">
              {tenantContracts.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Khách thuê này chưa có hợp đồng nào</p>
                </div>
              ) : (
                tenantContracts.map((ct) => {
                  const daysLeft = calculateDaysLeft(ct.end_date);
                  return (
                    <div
                      key={ct.id}
                      className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition-all shadow-sm space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <FileCheck2 className="w-5 h-5 text-emerald-600" />
                          <span className="font-bold text-slate-800">{ct.contract_code}</span>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {ct.room?.room_number || 'Phòng'}
                          </span>
                        </div>

                        {ct.status === 'active' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Đang hoạt động (còn {daysLeft} ngày)
                          </span>
                        )}
                        {ct.status === 'expiring_soon' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Sắp hết hạn (còn {daysLeft} ngày)
                          </span>
                        )}
                        {ct.status === 'expired' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Đã hết hạn ({Math.abs(daysLeft)} ngày trước)
                          </span>
                        )}
                        {ct.status === 'terminated' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Đã thanh lý
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-slate-500 block">Thời hạn hợp đồng</span>
                          <span className="font-semibold text-slate-800">
                            {ct.start_date} → {ct.end_date}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block">Tiền thuê / tháng</span>
                          <span className="font-bold text-emerald-700">{formatPrice(ct.rent_amount)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block">Tiền cọc giữ</span>
                          <span className="font-bold text-teal-700">{formatPrice(ct.deposit_amount)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block">Ngày nộp tiền</span>
                          <span className="font-semibold text-slate-800">Mùng {ct.payment_due_day} hàng tháng</span>
                        </div>
                      </div>

                      {/* Nút hành động */}
                      {ct.status !== 'terminated' && (
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          {onRenewContract && (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={async () => {
                                if (window.confirm(`Gia hạn hợp đồng ${ct.contract_code} thêm 6 tháng?`)) {
                                  setIsProcessing(true);
                                  await onRenewContract(ct.id, 6);
                                  setIsProcessing(false);
                                }
                              }}
                              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            >
                              + Gia hạn 6 tháng
                            </button>
                          )}
                          {onTerminateContract && (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={async () => {
                                if (window.confirm(`Thanh lý hợp đồng ${ct.contract_code}? Phòng sẽ trở lại trạng thái Trống.`)) {
                                  setIsProcessing(true);
                                  await onTerminateContract(ct.id);
                                  setIsProcessing(false);
                                }
                              }}
                              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                            >
                              Thanh lý hợp đồng
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">Mã khách: {tenant.id}</span>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
