/**
 * Vercel Serverless Function: Webhook IPN tiếp nhận thanh toán VietQR / PayOS / SePay / Casso
 * Endpoint: POST /api/webhook/payment-ipn
 * 
 * Nghiệp vụ Mô hình thu tiền Trọ Xinh (Chỉ thu từ Chủ Trọ):
 * 1. TX XU <userId>: Nạp Ví Xu (1 Xu = 1.000đ, nạp >= 500k tặng 10% Xu thưởng bonus_xu)
 * 2. TX BOOST <roomIdentifier>: Kích hoạt gói Đẩy tin VIP (15k, 29k, 59k Giờ Vàng, 199k 30 ngày)
 * 3. TX REPOST <roomIdentifier>: Đăng lại tin hết hạn lần 2+ (30k/15 ngày, 50k/30 ngày)
 * 4. TROXINH HD<codeDoc>: Đối soát gạch nợ hóa đơn tiền phòng cho chủ trọ K23
 */

import { createClient } from '@supabase/supabase-js';

interface UnifiedPaymentEvent {
  gateway: string;
  amount: number;
  content: string;
  referenceCode: string;
  accountNumber?: string;
  transactionDate?: string;
}

export default async function handler(req: any, res: any) {
  // Chỉ hỗ trợ POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'Supabase configuration missing (SUPABASE_URL or SUPABASE_KEY)'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const body = req.body || {};

  // Chuẩn hóa payload từ SePay / PayOS / Casso
  const events: UnifiedPaymentEvent[] = [];

  // Trường hợp SePay webhook
  if (body.transferAmount !== undefined && body.content !== undefined) {
    events.push({
      gateway: body.gateway || 'SePay',
      amount: Number(body.transferAmount) || 0,
      content: String(body.content || '').trim(),
      referenceCode: String(body.referenceCode || body.id || `TX_SP_${Date.now()}`),
      accountNumber: body.accountNumber,
      transactionDate: body.transactionDate
    });
  }
  // Trường hợp PayOS webhook
  else if (body.data && body.data.amount !== undefined) {
    events.push({
      gateway: 'PayOS',
      amount: Number(body.data.amount) || 0,
      content: String(body.data.description || '').trim(),
      referenceCode: String(body.data.reference || body.data.orderCode || `TX_PAYOS_${Date.now()}`),
      accountNumber: body.data.accountNumber,
      transactionDate: body.data.transactionDateTime
    });
  }
  // Trường hợp Casso webhook (có thể gửi mảng)
  else if (Array.isArray(body.data)) {
    for (const item of body.data) {
      events.push({
        gateway: 'Casso',
        amount: Number(item.amount) || 0,
        content: String(item.description || '').trim(),
        referenceCode: String(item.tid || item.id || `TX_CASSO_${Date.now()}`),
        accountNumber: item.bank_sub_acc_id,
        transactionDate: item.when
      });
    }
  }
  // Fallback body trực tiếp
  else if (body.amount !== undefined && (body.content || body.description)) {
    events.push({
      gateway: body.gateway || 'VietQR',
      amount: Number(body.amount) || 0,
      content: String(body.content || body.description || '').trim(),
      referenceCode: String(body.referenceCode || `TX_GEN_${Date.now()}`),
      accountNumber: body.accountNumber
    });
  }

  if (events.length === 0) {
    return res.status(400).json({ error: 'Không nhận diện được định dạng Webhook IPN' });
  }

  const results: any[] = [];

  for (const event of events) {
    const rawContent = event.content.toUpperCase();
    const amount = event.amount;

    try {
      // 1. NHÁNH 1: NẠP VÍ XU (Cú pháp: TX XU <userId>)
      const matchXu = rawContent.match(/TX\s+XU\s+([A-Za-z0-9_-]+)/i);
      if (matchXu && matchXu[1]) {
        const userId = matchXu[1].trim();
        const realXu = Math.floor(amount / 1000);
        // Nạp >= 500k (500 Xu) được tặng thêm 10% Xu thưởng
        const bonusXu = amount >= 500000 ? Math.floor(realXu * 0.1) : 0;

        // Tìm hoặc khởi tạo ví
        let { data: wallet } = await supabase
          .from('k23_wallets')
          .select('*')
          .eq('owner_id', userId)
          .maybeSingle();

        if (!wallet) {
          const { data: newWallet, error: createError } = await supabase
            .from('k23_wallets')
            .insert({
              owner_id: userId,
              balance_real_xu: realXu,
              balance_bonus_xu: bonusXu,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) throw createError;
          wallet = newWallet;
        } else {
          const updatedReal = (wallet.balance_real_xu || 0) + realXu;
          const updatedBonus = (wallet.balance_bonus_xu || 0) + bonusXu;

          await supabase
            .from('k23_wallets')
            .update({
              balance_real_xu: updatedReal,
              balance_bonus_xu: updatedBonus,
              updated_at: new Date().toISOString()
            })
            .eq('id', wallet.id);
        }

        // Ghi log giao dịch ví
        await supabase.from('k23_wallet_transactions').insert({
          wallet_id: wallet.id,
          owner_id: userId,
          amount_real_xu: realXu,
          amount_bonus_xu: bonusXu,
          transaction_type: 'deposit',
          reason: `Nạp ví qua ${event.gateway} (+${realXu.toLocaleString('vi-VN')} Xu thật${bonusXu > 0 ? `, +${bonusXu} Xu thưởng 10%` : ''})`,
          reference_id: event.referenceCode,
          created_at: new Date().toISOString()
        });

        results.push({
          type: 'TX_XU',
          userId,
          realXu,
          bonusXu,
          message: `Nạp thành công ${realXu} Xu (+${bonusXu} Xu thưởng) cho người dùng ${userId}`
        });
        continue;
      }

      // 2. NHÁNH 2: ĐẨY TIN VIP TRỰC TIẾP (Cú pháp: TX BOOST <roomIdentifier>)
      const matchBoost = rawContent.match(/TX\s+BOOST\s+([A-Za-z0-9_-]+)/i);
      if (matchBoost && matchBoost[1]) {
        const roomIdent = matchBoost[1].trim();

        // Tìm phòng theo id hoặc room_number
        const { data: room } = await supabase
          .from('rooms')
          .select('*')
          .or(`id.eq.${roomIdent},room_number.eq.${roomIdent}`)
          .maybeSingle();

        if (room) {
          // Tính số ngày VIP theo số tiền
          let boostDays = 1;
          let isGoldenHour = false;
          if (amount >= 199000) {
            boostDays = 30;
            isGoldenHour = true;
          } else if (amount >= 59000) {
            boostDays = 7;
            isGoldenHour = true; // Giờ vàng 11h-13h & 19h-22h
          } else if (amount >= 29000) {
            boostDays = 3;
          }

          const boostUntil = new Date(Date.now() + boostDays * 24 * 60 * 60 * 1000).toISOString();

          await supabase
            .from('rooms')
            .update({
              is_golden_hour_boosted: isGoldenHour,
              boost_expires_at: boostUntil,
              updated_at: new Date().toISOString()
            })
            .eq('id', room.id);

          results.push({
            type: 'TX_BOOST',
            roomId: room.id,
            boostDays,
            isGoldenHour,
            message: `Kích hoạt gói Đẩy tin VIP ${boostDays} ngày cho phòng ${room.room_number || room.id}`
          });
          continue;
        }
      }

      // 3. NHÁNH 3: ĐĂNG LẠI TIN HẾT HẠN (Cú pháp: TX REPOST <roomIdentifier>)
      const matchRepost = rawContent.match(/TX\s+REPOST\s+([A-Za-z0-9_-]+)/i);
      if (matchRepost && matchRepost[1]) {
        const roomIdent = matchRepost[1].trim();

        const { data: room } = await supabase
          .from('rooms')
          .select('*')
          .or(`id.eq.${roomIdent},room_number.eq.${roomIdent}`)
          .maybeSingle();

        if (room) {
          const extensionDays = amount >= 50000 ? 30 : 15;
          const newExpiresAt = new Date(Date.now() + extensionDays * 24 * 60 * 60 * 1000).toISOString();

          await supabase
            .from('rooms')
            .update({
              status: 'Còn trống',
              published_at: new Date().toISOString(),
              expires_at: newExpiresAt,
              repost_count: (room.repost_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', room.id);

          results.push({
            type: 'TX_REPOST',
            roomId: room.id,
            extensionDays,
            message: `Đăng lại tin thành công thêm ${extensionDays} ngày cho phòng ${room.room_number || room.id}`
          });
          continue;
        }
      }

      // 4. NHÁNH 4: ĐỐI SOÁT HÓA ĐƠN TIỀN PHÒNG CHO CHỦ TRỌ (Cú pháp: TROXINH HD... hoặc HD...)
      const matchHD = rawContent.match(/(HD[A-Za-z0-9_-]+)/i);
      if (matchHD && matchHD[1]) {
        const invoiceCode = matchHD[1].toUpperCase();

        const { data: inv } = await supabase
          .from('k23_invoices')
          .select('*')
          .eq('invoice_code', invoiceCode)
          .maybeSingle();

        if (inv) {
          const newPaid = (inv.paid_amount || 0) + amount;
          const newStatus = newPaid >= inv.total_amount ? 'paid' : 'partial';

          await supabase
            .from('k23_invoices')
            .update({
              paid_amount: newPaid,
              status: newStatus,
              payment_method: `VietQR ${event.gateway} (Tự động)`,
              paid_at: new Date().toISOString()
            })
            .eq('id', inv.id);

          // Ghi nhận log ngân hàng
          try {
            await supabase.from('k23_bank_transactions').insert({
              invoice_code: invoiceCode,
              owner_id: inv.owner_id,
              bank_account_number: event.accountNumber || 'Chính chủ',
              amount_in: amount,
              transaction_content: event.content,
              reference_code: event.referenceCode,
              gateway_provider: event.gateway,
              created_at: new Date().toISOString()
            });
          } catch {
            // ignore
          }

          results.push({
            type: 'K23_INVOICE_PAID',
            invoiceCode,
            newPaid,
            newStatus,
            message: `Gạch nợ hóa đơn #${invoiceCode} thành công: ${amount.toLocaleString('vi-VN')} đ`
          });
          continue;
        }
      }

      // Nếu không khớp cú pháp nào cụ thể, ghi nhận unhandled
      results.push({
        type: 'UNMATCHED',
        content: event.content,
        amount,
        message: 'Nội dung giao dịch không thuộc cú pháp Trọ Xinh'
      });

    } catch (err: any) {
      results.push({
        type: 'ERROR',
        content: event.content,
        error: err?.message || String(err)
      });
    }
  }

  return res.status(200).json({
    success: true,
    processedCount: results.length,
    results
  });
}

