import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  QrCode,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Phone,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { formatPrice } from '../components/ui/Cards';
import { searchTenantPortalInvoices, TenantPortalInvoiceResult } from '../lib/api/k23Invoices';
import { useK23Operations } from '../hooks/queries/useK23Operations';
import { generateVietQrUrl, POPULAR_BANKS } from '../lib/vietqr';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export const TenantWebPortalPage: React.FC = () => {
  const [searchPhone, setSearchPhone] = useState<string>('');
  const [submittedQuery, setSubmittedQuery] = useState<string>('');
  const [tenantInvoices, setTenantInvoices] = useState<TenantPortalInvoiceResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);

  // Form báo hỏng
  const [isIssueModalOpen, setIsIssueModalOpen] = useState<boolean>(false);
  const [issueTitle, setIssueTitle] = useState<string>('');
  const [issueDesc, setIssueDesc] = useState<string>('');
  const [issueSuccess, setIssueSuccess] = useState<boolean>(false);

  const { createIssue } = useK23Operations();

  const fetchTenantInvoices = useCallback(async (queryStr: string, silent = false) => {
    const trimmed = queryStr.trim();
    if (trimmed.length < 3) return;
    if (!silent) setIsLoading(true);
    try {
      const rows = await searchTenantPortalInvoices(trimmed);
      setTenantInvoices(rows);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchPhone.trim();
    if (trimmed.length < 3) return;
    setSubmittedQuery(trimmed);
    void fetchTenantInvoices(trimmed);
  };

  const latestInvoice: TenantPortalInvoiceResult | undefined = tenantInvoices[0];

  // Lắng nghe Realtime + Polling + Kiểm tra ngay khi khách thuê chuyển từ App Ngân hàng quay lại trình duyệt
  useEffect(() => {
    if (!latestInvoice || latestInvoice.status === 'paid' || !submittedQuery) return;

    const pollTimer = setInterval(() => {
      void fetchTenantInvoices(submittedQuery, true);
    }, 4000);

    const handleVisibilityOrFocus = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void fetchTenantInvoices(submittedQuery, true);
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`tenant-invoice-${latestInvoice.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'invoices',
            filter: `id=eq.${latestInvoice.id}`,
          },
          () => {
            void fetchTenantInvoices(submittedQuery, true);
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [latestInvoice?.id, latestInvoice?.status, submittedQuery, fetchTenantInvoices]);

  const handleCopy = (text: string, type: 'code' | 'acc') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitle.trim() || !latestInvoice) return;

    await createIssue({
      building_id: latestInvoice.room?.building_id || latestInvoice.building_info?.id || '',
      building_name: latestInvoice.building_info?.name || latestInvoice.room?.title || 'Tòa nhà',
      room_id: latestInvoice.room_id,
      room_number: latestInvoice.room?.room_number || 'Phòng',
      tenant_name: latestInvoice.tenant?.full_name || 'Khách thuê',
      tenant_phone: latestInvoice.tenant?.phone || searchPhone,
      owner_id: latestInvoice.owner_id,
      title: issueTitle.trim(),
      description: issueDesc.trim() || undefined,
      priority: 'high',
      status: 'pending',
      repair_cost: 0,
    });

    setIssueSuccess(true);
    setTimeout(() => {
      setIssueSuccess(false);
      setIsIssueModalOpen(false);
      setIssueTitle('');
      setIssueDesc('');
    }, 2000);
  };

  const buildingBankId = latestInvoice?.building_info?.bank_id || 'TCB';
  const buildingAccountNo = (latestInvoice?.building_info?.bank_account_no || '').trim();
  const buildingAccountName = (latestInvoice?.building_info?.bank_account_name || '').trim();
  const matchedBank = POPULAR_BANKS.find((b) => b.id.toUpperCase() === buildingBankId.toUpperCase());
  const remainingAmount = latestInvoice
    ? Math.max(0, latestInvoice.total_amount - (latestInvoice.paid_amount || 0))
    : 0;
  const transferContent = latestInvoice ? `TROXINH ${latestInvoice.invoice_code}` : '';

  const vietQrImageUrl =
    latestInvoice && buildingAccountNo && remainingAmount > 0
      ? generateVietQrUrl({
          bankId: buildingBankId,
          accountNo: buildingAccountNo,
          accountName: buildingAccountName,
          amount: remainingAmount,
          description: transferContent,
          template: 'compact2',
        })
      : '';

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header cổng khách thuê */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" /> Cổng Thông Tin Khách Thuê K23
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Tra Cứu Tiền Nhà &amp; Hóa Đơn
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Nhập số điện thoại hoặc mã hóa đơn để xem bảng kê chi tiết, quét VietQR thanh toán trực tiếp cho chủ trọ và tự động xác nhận ngay trên màn hình.
          </p>
        </div>

        {/* Thanh tìm kiếm số điện thoại / mã hóa đơn */}
        <form
          onSubmit={handleSearchSubmit}
          className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2"
        >
          <Phone className="w-5 h-5 text-slate-400 ml-2 shrink-0" />
          <input
            type="text"
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            placeholder="Nhập SĐT khách thuê hoặc mã hóa đơn (VD: HD123456)..."
            className="flex-1 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold rounded-xl cursor-pointer"
          >
            Tra cứu
          </Button>
        </form>

        {/* Kết quả tra cứu */}
        {submittedQuery && !isLoading && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {latestInvoice ? (
              <>
                <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
                  <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-emerald-200 uppercase tracking-wider block">
                        {latestInvoice.building_info?.name || 'Hóa đơn tiền phòng'}
                      </span>
                      <h2 className="text-xl font-bold mt-0.5">
                        Tháng {latestInvoice.billing_month}/{latestInvoice.billing_year}
                      </h2>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/20">
                        {latestInvoice.room?.room_number || latestInvoice.room?.title || 'Phòng'}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Bảng kê chi phí */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Chi tiết các khoản phí (#{latestInvoice.invoice_code})
                      </h3>

                      <div className="divide-y divide-slate-100 text-sm">
                        {(latestInvoice.items || []).map((it, idx) => (
                          <div key={idx} className="py-2.5 flex justify-between items-center">
                            <span className="text-slate-700 font-medium">{it.description}</span>
                            <span className="font-bold text-slate-900 font-mono">
                              {formatPrice(it.amount)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-base font-black">
                        <span className="text-slate-900">Tổng tiền thanh toán:</span>
                        <span className="text-emerald-700 text-xl font-mono">
                          {formatPrice(latestInvoice.total_amount)}
                        </span>
                      </div>

                      {latestInvoice.paid_amount > 0 && (
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                          <span>Đã thanh toán trước:</span>
                          <span className="text-emerald-600 font-mono">
                            −{formatPrice(latestInvoice.paid_amount)}
                          </span>
                        </div>
                      )}

                      {latestInvoice.status !== 'paid' && (
                        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex justify-between items-center text-sm font-black text-amber-900">
                          <span>Số tiền cần thanh toán:</span>
                          <span className="text-lg text-amber-700 font-mono">
                            {formatPrice(remainingAmount)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Khối Quét VietQR Thanh Toán */}
                    {latestInvoice.status !== 'paid' && (
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                          <QrCode className="w-4 h-4" /> Quét mã VietQR thanh toán cho Chủ trọ
                        </div>

                        {buildingAccountNo && vietQrImageUrl ? (
                          <>
                            <div className="w-56 h-56 mx-auto bg-white p-3 rounded-2xl border-2 border-dashed border-emerald-500/40 shadow-sm flex items-center justify-center">
                              <img
                                src={vietQrImageUrl}
                                alt={`VietQR Hóa đơn ${latestInvoice.invoice_code}`}
                                className="w-full h-full object-contain"
                              />
                            </div>

                            <div className="text-xs text-slate-600 space-y-2 max-w-sm mx-auto text-left bg-white p-3.5 rounded-xl border border-slate-200">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Ngân hàng nhận:</span>
                                <span className="font-bold text-slate-800">
                                  {matchedBank?.shortName || buildingBankId}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">Số tài khoản:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-800">
                                    {buildingAccountNo}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(buildingAccountNo, 'acc')}
                                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    {copiedAccount ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              {buildingAccountName && (
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Chủ tài khoản:</span>
                                  <span className="font-bold text-slate-800 uppercase">
                                    {buildingAccountName}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
                                <span className="text-slate-400">Nội dung:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                    {transferContent}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(transferContent, 'code')}
                                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    {copiedCode ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="pt-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void fetchTenantInvoices(submittedQuery)}
                                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                                className="text-xs font-bold cursor-pointer"
                              >
                                Kiểm tra cập nhật trạng thái
                              </Button>
                            </div>

                            <p className="text-[11px] text-slate-400">
                              * Màn hình sẽ tự động chuyển sang <strong>Đã thanh toán</strong> ngay sau khi nhận được xác nhận chuyển khoản.
                            </p>
                          </>
                        ) : (
                          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                            Chủ tòa nhà chưa cập nhật số tài khoản ngân hàng VietQR cho cơ sở này. Vui lòng liên hệ trực tiếp chủ trọ để lấy thông tin chuyển khoản.
                          </div>
                        )}
                      </div>
                    )}

                    {latestInvoice.status === 'paid' && (
                      <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1.5">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                        <span className="font-black text-emerald-950 block text-base">
                          Hóa đơn tháng này đã được thanh toán đủ!
                        </span>
                        <p className="text-xs text-emerald-700">
                          Cảm ơn bạn đã đóng tiền phòng đúng hạn. Hệ thống đã tự động gạch nợ thành công.
                        </p>
                      </div>
                    )}

                    {/* Nút Báo hỏng đồ đạc */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setIsIssueModalOpen(true)}
                        className="w-full py-3 rounded-2xl border border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                      >
                        <Wrench className="w-4 h-4 text-amber-700" />
                        <span>Phòng có đồ đạc bị hỏng? Bấm để báo chủ nhà sửa</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lịch sử hóa đơn các kỳ trước */}
                {tenantInvoices.length > 1 && (
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Lịch sử hóa đơn các tháng trước
                    </h3>
                    <div className="divide-y divide-slate-100">
                      {tenantInvoices.slice(1).map((inv) => (
                        <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-800">
                              Tháng {inv.billing_month}/{inv.billing_year}
                            </span>
                            <span className="text-slate-400 block text-[11px]">#{inv.invoice_code}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900 font-mono">
                              {formatPrice(inv.total_amount)}
                            </span>
                            <span
                              className={`font-semibold block text-[11px] ${
                                inv.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                              }`}
                            >
                              {inv.status === 'paid' ? 'Đã thanh toán' : 'Còn nợ'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">Không tìm thấy hóa đơn</h3>
                <p className="text-xs text-slate-500">
                  Không có hóa đơn nào khớp với thông tin vừa nhập. Vui lòng kiểm tra lại số điện thoại hoặc mã hóa đơn do chủ trọ cung cấp.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal Khách Báo Sự Cố */}
        {isIssueModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-600" /> Báo Sự Cố Phòng Cho Chủ Nhà
                </h3>
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {issueSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-slate-900 text-sm">Đã gửi yêu cầu sửa chữa!</h4>
                  <p className="text-xs text-slate-500">Chủ nhà đã tiếp nhận và sẽ sớm điều phối thợ đến kiểm tra.</p>
                </div>
              ) : (
                <form onSubmit={handleCreateIssue} className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Thiết bị hỏng hóc</label>
                    <input
                      type="text"
                      required
                      value={issueTitle}
                      onChange={(e) => setIssueTitle(e.target.value)}
                      placeholder="VD: Điều hòa chảy nước, Vòi sen bị gãy..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mô tả tình trạng</label>
                    <textarea
                      rows={3}
                      value={issueDesc}
                      onChange={(e) => setIssueDesc(e.target.value)}
                      placeholder="Mô tả cụ thể thời điểm bị hỏng để thợ mang đúng đồ..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="outline" type="button" onClick={() => setIsIssueModalOpen(false)}>
                      Hủy
                    </Button>
                    <Button variant="primary" type="submit" className="bg-amber-600 hover:bg-amber-700 font-bold">
                      Gửi cho chủ nhà
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default TenantWebPortalPage;
