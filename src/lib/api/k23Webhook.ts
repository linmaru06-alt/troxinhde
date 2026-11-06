import { supabase, isSupabaseConfigured } from '../supabase';
import { Invoice } from '../../types/k23';

export interface BankWebhookPayload {
  id?: string;
  gateway: 'SePay' | 'Casso' | 'VietQR';
  accountNumber: string;
  transferAmount: number;
  content: string; // VD: "TROXINH HD202611302 MBBank"
  referenceCode: string;
  transactionDate?: string;
}

export interface WebhookProcessResult {
  success: boolean;
  matchedInvoiceCode?: string;
  matchedInvoiceId?: string;
  amountReceived: number;
  newStatus?: 'paid' | 'partial';
  message: string;
}

/**
 * P1-06: Bóc tách mã hóa đơn từ nội dung chuyển khoản ngân hàng
 * VD: "MBVCB.123456.TROXINH HD202611302.CT TU LE THI THU MAI" -> "HD202611302"
 */
export function extractInvoiceCodeFromContent(content: string): string | null {
  if (!content) return null;

  // Pattern 1: TROXINH HDxxxx
  const matchTroxinh = content.match(/TROXINH\s+([A-Za-z0-9_-]+)/i);
  if (matchTroxinh && matchTroxinh[1]) {
    return matchTroxinh[1].toUpperCase();
  }

  // Pattern 2: HDxxxx
  const matchHD = content.match(/(HD[A-Za-z0-9_-]+)/i);
  if (matchHD && matchHD[1]) {
    return matchHD[1].toUpperCase();
  }

  return null;
}

/**
 * Xử lý webhook đối soát tự động từ ngân hàng (SePay / Casso)
 */
export async function processBankPaymentWebhook(
  payload: BankWebhookPayload,
  invoicesList?: Invoice[]
): Promise<WebhookProcessResult> {
  const extractedCode = extractInvoiceCodeFromContent(payload.content);

  if (!extractedCode) {
    return {
      success: false,
      amountReceived: payload.transferAmount,
      message: 'Không tìm thấy cú pháp mã hóa đơn (TROXINH HD...) trong nội dung chuyển khoản',
    };
  }

  // 1. Thử cập nhật trên Supabase nếu có
  if (isSupabaseConfigured) {
    try {
      // Tìm hóa đơn khớp code
      const { data: inv } = await supabase
        .from('k23_invoices')
        .select('*')
        .eq('invoice_code', extractedCode)
        .maybeSingle();

      if (inv) {
        const newPaid = (inv.paid_amount || 0) + payload.transferAmount;
        const newStatus = newPaid >= inv.total_amount ? 'paid' : 'partial';

        await supabase
          .from('k23_invoices')
          .update({
            paid_amount: newPaid,
            status: newStatus,
            payment_method: `VietQR ${payload.gateway} (Tự động)`,
            paid_at: new Date().toISOString(),
          })
          .eq('id', inv.id);

        // Lưu log giao dịch
        await supabase.from('k23_bank_transactions').insert({
          invoice_code: extractedCode,
          owner_id: inv.owner_id,
          bank_account_number: payload.accountNumber,
          amount_in: payload.transferAmount,
          transaction_content: payload.content,
          reference_code: payload.referenceCode,
          gateway_provider: payload.gateway,
        });

        return {
          success: true,
          matchedInvoiceCode: extractedCode,
          matchedInvoiceId: inv.id,
          amountReceived: payload.transferAmount,
          newStatus,
          message: `Gạch nợ thành công cho hóa đơn #${extractedCode}! Trạng thái: ${newStatus === 'paid' ? 'Đã thanh toán đủ 100%' : 'Thanh toán một phần'}.`,
        };
      }
    } catch (err: any) {
      console.warn('[Webhook] Supabase bypass:', err);
    }
  }

  // 2. Fallback xử lý danh sách hóa đơn trong bộ nhớ (Dành cho demo)
  if (invoicesList && invoicesList.length > 0) {
    const matched = invoicesList.find(
      (i) => i.invoice_code.toUpperCase() === extractedCode || extractedCode.includes(i.invoice_code.toUpperCase())
    );

    if (matched) {
      const newPaid = (matched.paid_amount || 0) + payload.transferAmount;
      const newStatus = newPaid >= matched.total_amount ? 'paid' : 'partial';

      matched.paid_amount = newPaid;
      matched.status = newStatus;
      matched.paid_at = new Date().toISOString();
      matched.payment_method = `VietQR ${payload.gateway} (Tự động)`;

      return {
        success: true,
        matchedInvoiceCode: matched.invoice_code,
        matchedInvoiceId: matched.id,
        amountReceived: payload.transferAmount,
        newStatus,
        message: `Đã đối soát thành công hóa đơn #${matched.invoice_code} (${matched.room?.room_number || 'Phòng'})! Số tiền: ${payload.transferAmount.toLocaleString('vi-VN')} đ.`,
      };
    }
  }

  return {
    success: true,
    matchedInvoiceCode: extractedCode,
    amountReceived: payload.transferAmount,
    message: `Đã nhận diện mã hóa đơn #${extractedCode} từ biến động số dư ngân hàng.`,
  };
}

