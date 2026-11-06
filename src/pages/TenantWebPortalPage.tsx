import React, { useState } from 'react';
import {
  Search,
  Building2,
  Calendar,
  DollarSign,
  QrCode,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  FileText,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { formatPrice } from '../components/ui/Cards';
import { useInvoices } from '../hooks/queries/useK23';
import { useK23Operations } from '../hooks/queries/useK23Operations';
import { Invoice } from '../types/k23';

export const TenantWebPortalPage: React.FC = () => {
  const [searchPhone, setSearchPhone] = useState<string>('0988 123 456');
  const [isSearched, setIsSearched] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Form báo hỏng
  const [isIssueModalOpen, setIsIssueModalOpen] = useState<boolean>(false);
  const [issueTitle, setIssueTitle] = useState<string>('');
  const [issueDesc, setIssueDesc] = useState<string>('');
  const [issueSuccess, setIssueSuccess] = useState<boolean>(false);

  const { data: allInvoices = [] } = useInvoices({
    ownerId: 'user_owner_1',
  });

  const { createIssue } = useK23Operations();

  // Lọc hóa đơn theo SĐT khách thuê
  const tenantInvoices = allInvoices.filter((inv) => {
    const cleanQuery = searchPhone.replace(/\s+/g, '');
    const invPhone = (inv.tenant?.phone || '').replace(/\s+/g, '');
    return invPhone.includes(cleanQuery) || inv.tenant?.full_name?.toLowerCase().includes(searchPhone.toLowerCase());
  });

  const latestInvoice: Invoice | undefined = tenantInvoices[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitle.trim() || !latestInvoice) return;

    await createIssue({
      building_id: latestInvoice.room?.building_id || 'bld_1',
      building_name: latestInvoice.room?.title || 'Tòa nhà',
      room_id: latestInvoice.room_id,
      room_number: latestInvoice.room?.room_number || 'Phòng',
      tenant_name: latestInvoice.tenant?.full_name || 'Khách thuê',
      tenant_phone: latestInvoice.tenant?.phone || searchPhone,
      owner_id: latestInvoice.owner_id || 'user_owner_1',
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header cổng khách thuê */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" /> Cổng Thông Tin Khách Thuê K23
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Tra Cứu Tiền Nhà & Hóa Đơn
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Xem hóa đơn hàng tháng, quét VietQR thanh toán 1-chạm và gửi yêu cầu sửa chữa đồ đạc trực tiếp cho chủ nhà.
          </p>
        </div>

        {/* Thanh tìm kiếm số điện thoại */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
          <Phone className="w-5 h-5 text-slate-400 ml-2 shrink-0" />
          <input
            type="text"
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            placeholder="Nhập số điện thoại của bạn (VD: 0988 123 456)..."
            className="flex-1 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
          <Button
            variant="primary"
            onClick={() => setIsSearched(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold rounded-xl"
          >
            Tra cứu
          </Button>
        </div>

        {/* Kết quả tra cứu */}
        {isSearched && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {latestInvoice ? (
              <>
                {/* Thẻ Hóa đơn tháng hiện tại */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
                  <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-emerald-200 uppercase tracking-wider block">
                        Hóa đơn tiền phòng
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
                        Chi tiết các khoản phí
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
                          <span>Số tiền còn nợ:</span>
                          <span className="text-lg text-amber-700 font-mono">
                            {formatPrice(Math.max(0, latestInvoice.total_amount - latestInvoice.paid_amount))}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Khối Quét VietQR Thanh Toán */}
                    {latestInvoice.status !== 'paid' && (
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                          <QrCode className="w-4 h-4" /> Quét mã VietQR thanh toán 1-chạm
                        </div>

                        {/* QR Code Image */}
                        <div className="w-52 h-52 mx-auto bg-white p-3 rounded-2xl border-2 border-dashed border-emerald-500/40 shadow-sm flex items-center justify-center">
                          <img
                            src={`https://api.vietqr.io/image/970422-0912345678-compact2.jpg?amount=${latestInvoice.total_amount - latestInvoice.paid_amount}&addInfo=TROXINH%20${latestInvoice.invoice_code}&accountName=CHU%20NHA`}
                            alt="VietQR Hóa đơn"
                            className="w-full h-full object-contain"
                          />
                        </div>

                        {/* Hướng dẫn chuyển khoản */}
                        <div className="text-xs text-slate-600 space-y-1.5 max-w-sm mx-auto text-left bg-white p-3.5 rounded-xl border border-slate-200">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Ngân hàng:</span>
                            <span className="font-bold text-slate-800">MB Bank (Quân Đội)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Số tài khoản:</span>
                            <span className="font-mono font-bold text-slate-800">0912345678</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Nội dung:</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-bold text-emerald-700">
                                TROXINH {latestInvoice.invoice_code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(`TROXINH ${latestInvoice.invoice_code}`)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400">
                          * Tiền sẽ tự động gạch nợ sau khi chuyển khoản thành công từ 3 đến 5 giây.
                        </p>
                      </div>
                    )}

                    {latestInvoice.status === 'paid' && (
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                        <span className="font-bold text-emerald-900 block text-sm">
                          Hóa đơn tháng này đã được thanh toán đủ!
                        </span>
                        <p className="text-xs text-emerald-700">Cảm ơn bạn đã đóng tiền phòng đúng hạn.</p>
                      </div>
                    )}

                    {/* Nút Báo hỏng đồ đạc */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setIsIssueModalOpen(true)}
                        className="w-full py-3 rounded-2xl border border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
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
                            <span className="text-emerald-600 font-semibold block text-[11px]">
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
                <h3 className="text-base font-bold text-slate-800">Không tìm thấy thông tin</h3>
                <p className="text-xs text-slate-500">
                  Vui lòng kiểm tra lại số điện thoại hoặc liên hệ với chủ trọ để được cấp quyền truy cập.
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
                  onClick={() => setIsIssueModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
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

