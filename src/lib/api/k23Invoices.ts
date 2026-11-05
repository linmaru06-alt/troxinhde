import { supabase, isSupabaseConfigured } from '../supabase';
import { Invoice, InvoiceItem, InvoiceStatus } from '../../types/k23';

export const FALLBACK_DEMO_INVOICES: Invoice[] = [
  {
    id: 'inv_demo_302_11',
    room_id: 'room_1',
    owner_id: '00000000-0000-0000-0000-000000000002',
    invoice_code: 'HD-202611-302',
    billing_month: 11,
    billing_year: 2026,
    due_date: '2026-11-10T00:00:00Z',
    total_amount: 4765000,
    paid_amount: 0,
    remaining: 4765000,
    status: 'sent',
    payment_method: 'Chuyển khoản VietQR',
    notes: 'Tiền phòng tháng 11/2026. Quý khách vui lòng thanh toán trước ngày 10.',
    created_at: '2026-11-01T08:00:00Z',
    room: {
      id: 'room_1',
      room_number: 'P.302',
      title: 'Phòng Studio Ban Công Thoáng Mát',
      building_id: 'bld_1',
      price: 4200000,
    },
    tenant: {
      id: 'usr_an_1',
      full_name: 'Nguyễn Văn An',
      phone: '0988123456',
    },
    items: [
      { id: 'it_1', item_type: 'rent', description: 'Tiền thuê phòng tháng 11/2026', quantity: 1, unit_price: 4200000, amount: 4200000 },
      { id: 'it_2', item_type: 'service', description: 'Tiền điện (70 kWh × 3.500đ/kWh)', quantity: 70, unit_price: 3500, amount: 245000 },
      { id: 'it_3', item_type: 'service', description: 'Tiền nước sinh hoạt (6 m³ × 25.000đ/m³)', quantity: 6, unit_price: 25000, amount: 150000 },
      { id: 'it_4', item_type: 'service', description: 'Rác sinh hoạt & Vệ sinh chung', quantity: 1, unit_price: 20000, amount: 20000 },
      { id: 'it_5', item_type: 'service', description: 'Internet Wifi cáp quang', quantity: 1, unit_price: 50000, amount: 50000 },
      { id: 'it_6', item_type: 'service', description: 'Phí gửi xe máy (1 xe)', quantity: 1, unit_price: 100000, amount: 100000 },
    ],
  },
  {
    id: 'inv_demo_303_11',
    room_id: 'room_2',
    owner_id: '00000000-0000-0000-0000-000000000002',
    invoice_code: 'HD-202611-303',
    billing_month: 11,
    billing_year: 2026,
    due_date: '2026-11-10T00:00:00Z',
    total_amount: 4207500,
    paid_amount: 4207500,
    remaining: 0,
    status: 'paid',
    paid_at: '2026-11-03T10:15:00Z',
    payment_method: 'Chuyển khoản VietQR',
    notes: 'Đã thanh toán đủ qua chuyển khoản VietQR quét mã tự động.',
    created_at: '2026-11-01T08:30:00Z',
    room: {
      id: 'room_2',
      room_number: 'P.303',
      title: 'Phòng Studio Đầy Đủ Nội Thất',
      building_id: 'bld_1',
      price: 3800000,
    },
    tenant: {
      id: 'usr_mai_2',
      full_name: 'Lê Thị Thu Mai',
      phone: '0977654321',
    },
    items: [
      { id: 'it_21', item_type: 'rent', description: 'Tiền thuê phòng tháng 11/2026', quantity: 1, unit_price: 3800000, amount: 3800000 },
      { id: 'it_22', item_type: 'service', description: 'Tiền điện (55 kWh × 3.500đ/kWh)', quantity: 55, unit_price: 3500, amount: 192500 },
      { id: 'it_23', item_type: 'service', description: 'Tiền nước sinh hoạt (4 m³ × 25.000đ/m³)', quantity: 4, unit_price: 25000, amount: 100000 },
      { id: 'it_24', item_type: 'service', description: 'Rác sinh hoạt & Vệ sinh chung', quantity: 1, unit_price: 20000, amount: 20000 },
      { id: 'it_25', item_type: 'service', description: 'Internet Wifi tốc độ cao', quantity: 1, unit_price: 50000, amount: 50000 },
      { id: 'it_26', item_type: 'service', description: 'Gửi xe máy (1 xe)', quantity: 1, unit_price: 100000, amount: 100000 },
      { id: 'it_27', item_type: 'deduction', description: 'Khuyến mãi tân sinh viên', quantity: 1, unit_price: -55000, amount: -55000 },
    ],
  },
  {
    id: 'inv_demo_302_10',
    room_id: 'room_1',
    owner_id: '00000000-0000-0000-0000-000000000002',
    invoice_code: 'HD-202610-302',
    billing_month: 10,
    billing_year: 2026,
    due_date: '2026-10-10T00:00:00Z',
    total_amount: 4680000,
    paid_amount: 4680000,
    remaining: 0,
    status: 'paid',
    paid_at: '2026-10-05T16:20:00Z',
    payment_method: 'Chuyển khoản VietQR',
    notes: 'Đã hoàn tất thanh toán kỳ tháng 10.',
    created_at: '2026-10-01T08:00:00Z',
    room: {
      id: 'room_1',
      room_number: 'P.302',
      title: 'Phòng Studio Ban Công Thoáng Mát',
      building_id: 'bld_1',
      price: 4200000,
    },
    tenant: {
      id: 'usr_an_1',
      full_name: 'Nguyễn Văn An',
      phone: '0988123456',
    },
    items: [
      { id: 'it_31', item_type: 'rent', description: 'Tiền thuê phòng tháng 10/2026', quantity: 1, unit_price: 4200000, amount: 4200000 },
      { id: 'it_32', item_type: 'service', description: 'Tiền điện (60 kWh × 3.500đ/kWh)', quantity: 60, unit_price: 3500, amount: 210000 },
      { id: 'it_33', item_type: 'service', description: 'Tiền nước sinh hoạt (4 m³ × 25.000đ/m³)', quantity: 4, unit_price: 25000, amount: 100000 },
      { id: 'it_34', item_type: 'service', description: 'Rác sinh hoạt', quantity: 1, unit_price: 20000, amount: 20000 },
      { id: 'it_35', item_type: 'service', description: 'Internet Wifi', quantity: 1, unit_price: 50000, amount: 50000 },
      { id: 'it_36', item_type: 'service', description: 'Gửi xe máy (1 xe)', quantity: 1, unit_price: 100000, amount: 100000 },
    ],
  },
];

export async function getInvoices(params: {
  ownerId: string;
  buildingId?: string;
  month?: number;
  year?: number;
  status?: string;
}): Promise<Invoice[]> {
  if (!isSupabaseConfigured || !params.ownerId) {
    return filterFallbackInvoices(params);
  }

  try {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        room:rooms(id, room_number, title, building_id, price),
        tenant:tenants(id, full_name, phone),
        items:invoice_items(*)
      `)
      .eq('owner_id', params.ownerId);

    if (params.month) {
      query = query.eq('billing_month', params.month);
    }
    if (params.year) {
      query = query.eq('billing_year', params.year);
    }
    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error || !data || data.length === 0) {
      return filterFallbackInvoices(params);
    }

    if (params.buildingId && data) {
      const filtered = data.filter((inv) => inv.room?.building_id === params.buildingId);
      return filtered.length > 0 ? filtered : filterFallbackInvoices(params);
    }

    return data || [];
  } catch {
    return filterFallbackInvoices(params);
  }
}

function filterFallbackInvoices(params: {
  buildingId?: string;
  month?: number;
  year?: number;
  status?: string;
}): Invoice[] {
  let list = [...FALLBACK_DEMO_INVOICES];
  if (params.buildingId) {
    list = list.filter((inv) => !inv.room?.building_id || inv.room.building_id === params.buildingId);
  }
  if (params.month) {
    list = list.filter((inv) => inv.billing_month === params.month);
  }
  if (params.year) {
    list = list.filter((inv) => inv.billing_year === params.year);
  }
  if (params.status && params.status !== 'all') {
    list = list.filter((inv) => inv.status === params.status);
  }
  return list;
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const foundFallback = FALLBACK_DEMO_INVOICES.find((inv) => inv.id === id);
  if (!isSupabaseConfigured || !id) return foundFallback || null;

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        room:rooms(id, room_number, title, building_id, price),
        tenant:tenants(id, full_name, phone),
        items:invoice_items(*)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return foundFallback || null;
    }

    return data;
  } catch {
    return foundFallback || null;
  }
}

export async function saveInvoiceWithItems(params: {
  invoice: Partial<Invoice>;
  items: Array<Partial<InvoiceItem>>;
}): Promise<Invoice | null> {
  if (!isSupabaseConfigured) {
    const fakeInv: Invoice = {
      id: `inv_${Date.now()}`,
      room_id: params.invoice.room_id || 'room_1',
      owner_id: params.invoice.owner_id || '00000000-0000-0000-0000-000000000002',
      invoice_code: params.invoice.invoice_code || `HD-${Date.now().toString().slice(-6)}`,
      billing_month: params.invoice.billing_month || new Date().getMonth() + 1,
      billing_year: params.invoice.billing_year || new Date().getFullYear(),
      total_amount: params.items.reduce((sum, it) => sum + (it.amount || 0), 0),
      paid_amount: params.invoice.paid_amount || 0,
      remaining: Math.max(0, params.items.reduce((sum, it) => sum + (it.amount || 0), 0) - (params.invoice.paid_amount || 0)),
      status: (params.invoice.status as InvoiceStatus) || 'sent',
      payment_method: 'Chuyển khoản VietQR',
      items: params.items as InvoiceItem[],
      created_at: new Date().toISOString(),
    };
    return fakeInv;
  }

  const { invoice, items } = params;
  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const paidAmount = invoice.paid_amount || 0;

  try {
    const invoicePayload = {
      ...invoice,
      total_amount: Math.max(0, totalAmount),
      paid_amount: paidAmount,
      status:
        paidAmount >= totalAmount && totalAmount > 0
          ? 'paid'
          : paidAmount > 0
          ? 'partial'
          : invoice.status || 'sent',
      created_at: invoice.created_at || new Date().toISOString(),
    };

    const { data: invData, error: invError } = await supabase
      .from('invoices')
      .upsert(invoicePayload, { onConflict: 'room_id,billing_month,billing_year' })
      .select()
      .single();

    if (invError || !invData) {
      console.warn('[k23Invoices] saveInvoice error:', invError);
      return null;
    }

    if (items.length > 0) {
      await supabase.from('invoice_items').delete().eq('invoice_id', invData.id);

      const itemsPayload = items.map((item) => ({
        invoice_id: invData.id,
        item_type: item.item_type || 'service',
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        amount: item.amount || 0,
      }));

      const { error: itemsError } = await supabase.from('invoice_items').insert(itemsPayload);
      if (itemsError) {
        console.warn('[k23Invoices] saveInvoiceItems error:', itemsError);
      }
    }

    return getInvoiceById(invData.id);
  } catch {
    return null;
  }
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
  paymentDetails?: {
    paidAmount?: number;
    paymentMethod?: string;
    paymentProofUrl?: string;
  }
): Promise<boolean> {
  const target = FALLBACK_DEMO_INVOICES.find((inv) => inv.id === invoiceId);
  if (target) {
    target.status = status;
    if (status === 'paid') {
      target.paid_amount = target.total_amount;
      target.remaining = 0;
      target.paid_at = new Date().toISOString();
    }
  }

  if (!isSupabaseConfigured) return true;

  try {
    const updatePayload: any = {
      status,
    };

    if (status === 'paid') {
      updatePayload.paid_at = new Date().toISOString();
    }

    if (paymentDetails?.paymentMethod) {
      updatePayload.payment_method = paymentDetails.paymentMethod;
    }
    if (paymentDetails?.paymentProofUrl) {
      updatePayload.payment_proof_url = paymentDetails.paymentProofUrl;
    }

    const { error } = await supabase.from('invoices').update(updatePayload).eq('id', invoiceId);
    return !error;
  } catch {
    return true;
  }
}

export async function deleteInvoice(invoiceId: string): Promise<boolean> {
  const idx = FALLBACK_DEMO_INVOICES.findIndex((inv) => inv.id === invoiceId);
  if (idx !== -1) {
    FALLBACK_DEMO_INVOICES.splice(idx, 1);
  }

  if (!isSupabaseConfigured) return true;

  try {
    await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
    return !error;
  } catch {
    return true;
  }
}
