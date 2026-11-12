import {
  getWalletSupabaseClient,
  resolveProfileByFirebaseUid,
  verifyFirebaseIdToken,
} from '../_lib/walletServer.js';
import {
  SERVER_BOOST_PACKAGES,
  SERVER_K23_PLANS,
  SERVER_LISTING_PLANS,
  ServiceOrderType,
  XU_TO_VND_RATE,
  buildPaymentQrAndReceiver,
  generateServiceOrderCode,
  resolveCouponDiscountPercent,
} from '../_lib/monetizationServer.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST.' });
  }

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const claims = await verifyFirebaseIdToken(authHeader);

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const serviceType = String(body.serviceType || '').trim() as ServiceOrderType;
    const method = body.method === 'momo' ? 'momo' : 'vietqr';

    if (!['listing_plan', 'boost', 'k23', 'repost'].includes(serviceType)) {
      return res.status(400).json({ error: 'Loại dịch vụ thanh toán không hợp lệ.' });
    }

    const { supabase } = getWalletSupabaseClient(authHeader);
    const profile = await resolveProfileByFirebaseUid(supabase, claims.uid);

    if (!profile) {
      return res.status(404).json({
        error: 'Chưa tìm thấy hồ sơ người dùng trên Supabase. Vui lòng đăng nhập lại.',
      });
    }

    const isSandbox = Boolean(profile.is_demo_account || claims.isDemoClaim);
    const orderCode = generateServiceOrderCode(serviceType);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

    let amountXu = 0;
    let planIdForTx = '';
    let roomIdForTx: string | null = null;
    let metadata: Record<string, any> = {
      service_type: serviceType,
      fulfillment_mode: 'rpc',
      is_sandbox: isSandbox,
    };
    let description = '';

    if (serviceType === 'listing_plan') {
      let rawPlan = String(body.itemId || '').trim().toLowerCase();
      if (rawPlan === 'basic') rawPlan = 'featured';
      const plan = SERVER_LISTING_PLANS[rawPlan];
      if (!plan) {
        return res.status(400).json({ error: 'Gói đăng phòng không hợp lệ.' });
      }
      const cycle = plan.billingType === 'subscription' && body.billingCycle === 'yearly' ? 'yearly' : 'monthly';
      const baseXu = cycle === 'yearly' && plan.yearlyPriceXu ? plan.yearlyPriceXu : plan.priceXu;
      const couponCode = String(body.couponCode || '').trim().toUpperCase();
      const discountPercent = resolveCouponDiscountPercent(couponCode);
      amountXu =
        discountPercent > 0
          ? Math.max(1, Math.round((baseXu * (100 - discountPercent)) / 100))
          : baseXu;

      planIdForTx = plan.id;
      description = `${plan.name} (${cycle === 'yearly' ? '1 năm' : plan.billingType === 'one_time' ? '1 lượt' : '1 tháng'})`;
      metadata = {
        ...metadata,
        plan_id: plan.id,
        plan_name: plan.name,
        billing_cycle: cycle,
        coupon_code: couponCode || null,
        discount_percent: discountPercent,
        amount_xu: amountXu,
      };
    } else if (serviceType === 'boost') {
      const boostId = String(body.itemId || '').trim().toLowerCase();
      const pkg = SERVER_BOOST_PACKAGES[boostId];
      if (!pkg) {
        return res.status(400).json({ error: 'Gói đẩy tin không hợp lệ.' });
      }
      const roomId = String(body.roomId || '').trim();
      if (!roomId) {
        return res.status(400).json({ error: 'Thiếu mã phòng cần đẩy tin.' });
      }
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .select('id, owner_id, title, room_number')
        .eq('id', roomId)
        .maybeSingle();

      if (roomErr || !room) {
        return res.status(404).json({ error: 'Không tìm thấy phòng trọ để đẩy tin.' });
      }
      if (room.owner_id !== profile.id) {
        return res.status(403).json({ error: 'Bạn không có quyền đẩy tin cho phòng này.' });
      }

      amountXu = pkg.priceXu;
      planIdForTx = `boost_${pkg.id}`;
      roomIdForTx = room.id;
      description = `${pkg.name} - ${room.title || room.room_number || room.id}`;
      metadata = {
        ...metadata,
        boost_id: pkg.id,
        boost_name: pkg.name,
        days: pkg.days,
        room_id: room.id,
        amount_xu: amountXu,
      };
    } else if (serviceType === 'k23') {
      let rawCode = String(body.itemId || '').trim().toLowerCase();
      if (rawCode === 'pro') rawCode = 'standard';
      if (rawCode === 'enterprise') rawCode = 'chain';
      const k23Plan = SERVER_K23_PLANS[rawCode];
      if (!k23Plan) {
        return res.status(400).json({ error: 'Gói K23 không hợp lệ.' });
      }
      const cycle = body.billingCycle === 'yearly' ? 'yearly' : 'monthly';
      amountXu = cycle === 'yearly' ? k23Plan.priceYearlyXu : k23Plan.priceMonthlyXu;
      planIdForTx = `k23_${k23Plan.code}`;
      description = `K23 gói ${k23Plan.name} (${cycle === 'yearly' ? '1 năm - đóng 10 tặng 2' : '1 tháng'})`;
      metadata = {
        ...metadata,
        plan_code: k23Plan.code,
        plan_name: k23Plan.name,
        billing_cycle: cycle,
        amount_xu: amountXu,
      };
    } else if (serviceType === 'repost') {
      const durationDays = Number(body.durationDays) === 15 ? 15 : 30;
      const roomId = String(body.roomId || '').trim();
      if (!roomId) {
        return res.status(400).json({ error: 'Thiếu mã phòng cần gia hạn / đăng lại.' });
      }
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .select('id, owner_id, title, room_number')
        .eq('id', roomId)
        .maybeSingle();

      if (roomErr || !room) {
        return res.status(404).json({ error: 'Không tìm thấy phòng trọ cần gia hạn.' });
      }
      if (room.owner_id !== profile.id) {
        return res.status(403).json({ error: 'Bạn không có quyền gia hạn phòng này.' });
      }

      amountXu = durationDays === 15 ? 30 : 50;
      planIdForTx = `repost_${durationDays}d`;
      roomIdForTx = room.id;
      description = `Đăng lại tin ${durationDays} ngày - ${room.title || room.room_number || room.id}`;
      metadata = {
        ...metadata,
        room_id: room.id,
        duration_days: durationDays,
        amount_xu: amountXu,
      };
    }

    const amountVnd = amountXu * XU_TO_VND_RATE;

    const { data: insertedTx, error: insertErr } = await supabase
      .from('transactions')
      .insert({
        order_code: orderCode,
        user_id: profile.id,
        plan_id: planIdForTx,
        room_id: roomIdForTx,
        amount: amountVnd,
        payment_method: method,
        status: 'pending',
        expires_at: expiresAt,
        metadata,
        created_at: now.toISOString(),
      })
      .select('id, order_code, plan_id, room_id, amount, payment_method, status, expires_at, metadata, created_at')
      .single();

    if (insertErr || !insertedTx) {
      return res.status(500).json({
        error: `Không thể tạo đơn thanh toán: ${insertErr?.message || 'Lỗi máy chủ'}`,
      });
    }

    if (serviceType === 'k23') {
      try {
        await supabase.from('k23_subscription_orders').insert({
          order_code: orderCode,
          owner_id: profile.id,
          plan_code: metadata.plan_code,
          billing_cycle: metadata.billing_cycle,
          amount: amountVnd,
          amount_xu: amountXu,
          status: 'pending',
          payment_method: method,
          created_at: now.toISOString(),
        });
      } catch {
        // Không chặn luồng chính nếu k23_subscription_orders chưa được migrate; fulfill_paid_service_order vẫn kích hoạt từ transactions
      }
    }

    const { qrCode, deeplink, receiverInfo } = buildPaymentQrAndReceiver(method, amountVnd, orderCode);

    return res.status(200).json({
      success: true,
      order: {
        id: insertedTx.id,
        orderCode: insertedTx.order_code,
        serviceType,
        planId: planIdForTx,
        roomId: roomIdForTx,
        description,
        amountXu,
        amountVnd,
        method,
        status: insertedTx.status,
        expiresAt: insertedTx.expires_at || expiresAt,
        isSandbox,
        qrCode,
        deeplink,
        transferContent: orderCode,
        receiverInfo,
      },
    });
  } catch (err: any) {
    const message = err?.message || 'Không thể khởi tạo đơn thanh toán.';
    const isAuthError = message.includes('Firebase') || message.includes('Bearer');
    return res.status(isAuthError ? 401 : 400).json({ error: message });
  }
}

