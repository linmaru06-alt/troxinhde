import { supabase, isSupabaseConfigured } from '../supabase';
import { Invoice, InvoiceItem, InvoiceStatus } from '../../types/k23';

export async function getInvoices(params: {
  ownerId: string;
  buildingId?: string;
  month?: number;
  year?: number;
  status?: string;
}): Promise<Invoice[]> {
  if (!isSupabaseConfigured || !params.ownerId) return [];

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
  if (error) {
    console.warn('[k23Invoices] getInvoices error:', error);
    return [];
  }

  // Filter by buildingId if requested
  if (params.buildingId && data) {
    return data.filter((inv) => inv.room?.building_id === params.buildingId);
  }

  return data || [];
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  if (!isSupabaseConfigured || !id) return null;

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

  if (error) {
    console.warn('[k23Invoices] getInvoiceById error:', error);
    return null;
  }

  return data;
}

export async function saveInvoiceWithItems(params: {
  invoice: Partial<Invoice>;
  items: Array<Partial<InvoiceItem>>;
}): Promise<Invoice | null> {
  if (!isSupabaseConfigured) return null;

  const { invoice, items } = params;

  // Calculate total from items
  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const paidAmount = invoice.paid_amount || 0;

  // 1. Upsert Invoice
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
  };

  let savedInvoice: Invoice | null = null;

  if (invoice.id) {
    const { data, error } = await supabase
      .from('invoices')
      .update(invoicePayload)
      .eq('id', invoice.id)
      .select()
      .single();
    if (error) throw error;
    savedInvoice = data;
  } else {
    // Generate invoice_code if missing
    const code =
      invoice.invoice_code ||
      `INV-${Date.now().toString().slice(-6)}-P${invoice.room_id?.slice(0, 4) || '0'}`;
    const { data, error } = await supabase
      .from('invoices')
      .insert({ ...invoicePayload, invoice_code: code })
      .select()
      .single();
    if (error) throw error;
    savedInvoice = data;
  }

  if (!savedInvoice) return null;

  // 2. Refresh invoice items: delete existing items and insert new ones
  await supabase.from('invoice_items').delete().eq('invoice_id', savedInvoice.id);

  if (items.length > 0) {
    const itemsPayload = items.map((it) => ({
      invoice_id: savedInvoice!.id,
      item_type: it.item_type || 'service',
      description: it.description || '',
      quantity: it.quantity || 1,
      unit_price: it.unit_price || 0,
      amount: it.amount ?? (it.quantity || 1) * (it.unit_price || 0),
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsPayload);

    if (itemsError) throw itemsError;
  }

  return getInvoiceById(savedInvoice.id);
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
  paidAmount?: number,
  paymentMethod?: string
): Promise<void> {
  if (!isSupabaseConfigured || !id) return;

  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (typeof paidAmount === 'number') {
    updates.paid_amount = paidAmount;
  }
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
  }
  if (paymentMethod) {
    updates.payment_method = paymentMethod;
  }

  const { error } = await supabase.from('invoices').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteInvoice(id: string): Promise<void> {
  if (!isSupabaseConfigured || !id) return;

  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}

