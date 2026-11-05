import { K23VipGate } from '../components/k23/subscription/K23VipGate';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { useAppStore } from '../store/useAppStore';
import { useInvoiceDetail, useSaveInvoice } from '../hooks/queries/useK23';
import { InvoiceBillView } from '../components/k23/InvoiceBillView';
import { ShareBillButton } from '../components/k23/ShareBillButton';
import { InvoiceItem, InvoiceStatus } from '../types/k23';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Calendar,
  CheckCircle,
  FileText,
  AlertCircle,
} from 'lucide-react';

export const OwnerInvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, buildings, showToast } = useAppStore();

  const billViewRef = useRef<HTMLDivElement>(null);

  const { data: invoice, isLoading } = useInvoiceDetail(id);
  const saveInvoiceMutation = useSaveInvoice();

  // Local editable form state
  const [status, setStatus] = useState<InvoiceStatus>('sent');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<Array<Partial<InvoiceItem>>>([]);

  // Bank Info state for VietQR
  const [bankId, setBankId] = useState<string>('MB');
  const [accountNo, setAccountNo] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');

  // Sync loaded invoice to local form state
  useEffect(() => {
    if (!invoice) return;
    setStatus(invoice.status || 'sent');
    setPaidAmount(invoice.paid_amount || 0);
    setDueDate(invoice.due_date || '');
    setNotes(invoice.notes || '');
    setItems(
      (invoice.items || []).map((it) => ({
        id: it.id,
        item_type: it.item_type,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        amount: it.amount,
      }))
    );

    // Try loading building bank settings
    const bId = invoice.room?.building_id;
    let loadedBank = false;
    if (bId) {
      try {
        const saved = localStorage.getItem(`k23_bank_${bId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setBankId(parsed.bankId || 'MB');
          setAccountNo(parsed.accountNo || '');
          setAccountName(parsed.accountName || '');
          if (parsed.accountNo) loadedBank = true;
        }
      } catch {
        // ignore
      }
    }
    // Fallback cho tài khoản demo chủ trọ
    if (!loadedBank) {
      setBankId('MB');
      setAccountNo('0912345678');
      setAccountName('TRAN QUOC TUAN');
    }
  }, [invoice]);

  const handleAddItem = (type: 'extra' | 'deduction') => {
    setItems((prev) => [
      ...prev,
      {
        item_type: type,
        description: type === 'extra' ? 'Phí phát sinh...' : 'Giảm trừ tiền nhà...',
        quantity: 1,
        unit_price: type === 'extra' ? 50000 : -100000,
        amount: type === 'extra' ? 50000 : -100000,
      },
    ]);
  };

  const handleItemChange = (
    index: number,
    field: 'description' | 'quantity' | 'unit_price',
    val: string
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };

      if (field === 'description') {
        item.description = val;
      } else if (field === 'quantity') {
        item.quantity = parseFloat(val) || 1;
        item.amount = (item.quantity || 1) * (item.unit_price || 0);
      } else if (field === 'unit_price') {
        item.unit_price = parseFloat(val) || 0;
        item.amount = (item.quantity || 1) * item.unit_price;
      }

      copy[index] = item;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!invoice) return;

    try {
      await saveInvoiceMutation.mutateAsync({
        invoice: {
          id: invoice.id,
          room_id: invoice.room_id,
          owner_id: invoice.owner_id,
          billing_month: invoice.billing_month,
          billing_year: invoice.billing_year,
          invoice_code: invoice.invoice_code,
          status,
          paid_amount: paidAmount,
          due_date: dueDate || null,
          notes,
        },
        items: items.map((it) => ({
          ...it,
          amount: (it.quantity || 1) * (it.unit_price || 0),
        })),
      });

      if (showToast) {
        showToast('Đã cập nhật hóa đơn thành công!', 'success');
      } else {
        alert('Đã cập nhật hóa đơn thành công!');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể lưu hóa đơn. Vui lòng thử lại!');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
        <DashboardSidebar role="owner" />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 animate-pulse text-sm">Đang tải hóa đơn...</p>
        </main>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
        <DashboardSidebar role="owner" />
        <main className="flex-1 p-8 text-center">
          <p className="text-rose-500 font-bold mb-4">Không tìm thấy hóa đơn này!</p>
          <Link
            to="/chu-tro/hoa-don"
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
          >
            Quay lại danh sách
          </Link>
        </main>
      </div>
    );
  }

  // Find building info
  const building = buildings.find((b) => b.id === invoice.room?.building_id);

  // Compute live preview total
  const liveTotal = items.reduce(
    (sum, it) => sum + ((it.quantity || 1) * (it.unit_price || 0)),
    0
  );
  const liveRemaining = Math.max(0, liveTotal - paidAmount);

  // Constructed invoice for preview
  const previewInvoice = {
    ...invoice,
    status,
    paid_amount: paidAmount,
    total_amount: liveTotal,
    remaining: liveRemaining,
    due_date: dueDate,
    notes,
    items: items as InvoiceItem[],
  };

  return (
    <K23VipGate featureTitle="Chi Tiết Hóa Đơn Tiền Nhà A5">
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <DashboardSidebar role="owner" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between">
            <Link
              to="/chu-tro/hoa-don"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại danh sách hóa đơn</span>
            </Link>

            <div className="flex items-center gap-2">
              <ShareBillButton
                targetRef={billViewRef}
                invoiceCode={invoice.invoice_code}
                roomTitle={invoice.room?.room_number ? `P${invoice.room.room_number}` : 'phong'}
              />
            </div>
          </div>

          {/* Split View: Edit Form on Left, Live Bill Preview on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Form Controls (7 cols) */}
            <div className="lg:col-span-6 space-y-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    Điều Chỉnh Hóa Đơn #{invoice.invoice_code}
                  </h2>
                  <span className="text-xs text-slate-400 font-mono">
                    Tháng {invoice.billing_month}/{invoice.billing_year}
                  </span>
                </div>

                {/* Status & Payment input */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-500 font-semibold block mb-1">
                      Trạng thái thu tiền
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value="sent">Đã gửi bill (Chưa trả)</option>
                      <option value="paid">Đã thanh toán đủ</option>
                      <option value="partial">Đã trả một phần</option>
                      <option value="overdue">Quá hạn nộp tiền</option>
                      <option value="draft">Bản nháp</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 font-semibold block mb-1">
                      Số tiền đã thu trước (đ)
                    </label>
                    <input
                      type="number"
                      value={paidAmount || ''}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Due Date & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-500 font-semibold block mb-1">
                      Hạn chót thanh toán
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 font-semibold block mb-1">
                      Ghi chú thêm gửi khách
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ví dụ: Đã trừ 50k tiền bóng đèn..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                </div>

                {/* Items List */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Các Khoản Mục Tính Tiền
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAddItem('extra')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <Plus className="w-3 h-3" />
                        Thêm phí
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddItem('deduction')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        <Plus className="w-3 h-3" />
                        Giảm trừ
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {items.map((it, idx) => (
                      <div
                        key={it.id || idx}
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                      >
                        <input
                          type="text"
                          value={it.description || ''}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="flex-1 bg-transparent font-medium text-slate-800 dark:text-slate-200 outline-none"
                          placeholder="Tên mục..."
                        />
                        <div className="flex items-center gap-1 w-20">
                          <span className="text-[10px] text-slate-400">SL:</span>
                          <input
                            type="number"
                            step="any"
                            value={it.quantity ?? 1}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-12 text-center bg-white dark:bg-slate-800 border rounded py-0.5 font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                        <div className="flex items-center gap-1 w-28">
                          <input
                            type="number"
                            step="any"
                            value={it.unit_price ?? 0}
                            onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                            className="w-full text-right bg-white dark:bg-slate-800 border rounded py-0.5 px-1 font-mono font-bold text-slate-900 dark:text-white"
                            placeholder="Đơn giá"
                          />
                          <span className="text-[10px] text-slate-400">đ</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 hover:text-rose-600 text-slate-400"
                          title="Xóa mục này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save button */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saveInvoiceMutation.isPending}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 shadow flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {saveInvoiceMutation.isPending ? 'Đang lưu...' : 'Lưu Thay Đổi Hóa Đơn'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Live Preview Bill (5 cols) */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="w-full sticky top-4">
                <InvoiceBillView
                  ref={billViewRef}
                  invoice={previewInvoice}
                  buildingName={building?.name || 'Nhà trọ Trọ Xinh'}
                  buildingAddress={building?.address}
                  ownerName={currentUser?.name}
                  ownerPhone={currentUser?.phone}
                  bankId={bankId}
                  bankAccountNo={accountNo}
                  bankAccountName={accountName}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
    </K23VipGate>
  );
};

