import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServicePaymentOrderStatus } from '../lib/api/monetization';
import { getPayOSOrderStatus } from '../lib/payos';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { PaymentMethod, SubscriptionPlanId } from '../types';
import { XU_TO_VND_RATE, sanitizeReturnUrl } from '../lib/monetizationCatalog';

interface PollingOptions {
  billingCycle?: 'one_time' | 'monthly' | 'yearly';
  amountXu?: number;
  returnUrl?: string;
}

export function usePaymentPolling(
  orderCode: number | string | null,
  planId: string,
  totalAmountVnd: number,
  method: PaymentMethod = 'vietqr',
  onSuccess?: () => void,
  options?: PollingOptions
) {
  const [status, setStatus] = useState<'idle' | 'waiting' | 'success' | 'failed' | 'expired'>('idle');
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(900);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const navigate = useNavigate();
  const { upgradeSubscription, showToast } = useAppStore();

  const billingCycle = options?.billingCycle || 'monthly';
  const amountXu = options?.amountXu ?? Math.round(totalAmountVnd / XU_TO_VND_RATE);
  const safeReturnUrl = sanitizeReturnUrl(options?.returnUrl, '');

  const buildResultUrl = useCallback(() => {
    if (method === 'payos') {
      return `/thanh-toan/thanh-cong?orderCode=${encodeURIComponent(String(orderCode || ''))}&amount=${totalAmountVnd}`;
    }
    const qs = new URLSearchParams({
      service: 'listing_plan',
      orderId: String(orderCode || ''),
      amount: String(totalAmountVnd),
      amountXu: String(amountXu),
      plan: planId,
      cycle: billingCycle,
      method,
      status: 'success',
    });
    if (safeReturnUrl) {
      qs.set('returnUrl', safeReturnUrl);
    }
    return `/thanh-toan/ket-qua?${qs.toString()}`;
  }, [orderCode, totalAmountVnd, amountXu, planId, billingCycle, method, safeReturnUrl]);

  const completeOrder = useCallback(() => {
    setStatus('success');
    upgradeSubscription(planId as SubscriptionPlanId, method, totalAmountVnd);
    showToast('Thanh toán thành công!', `Gói dịch vụ #${orderCode} đã được kích hoạt.`, 'success');
    if (onSuccess) onSuccess();
    setTimeout(() => {
      navigate(buildResultUrl());
    }, 1000);
  }, [planId, method, totalAmountVnd, orderCode, upgradeSubscription, showToast, onSuccess, navigate, buildResultUrl]);

  // Countdown 15 phút
  useEffect(() => {
    if (!orderCode || status === 'success' || status === 'failed' || status === 'expired') return;

    setStatus('waiting');
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderCode, status]);

  // Realtime listener trên bảng transactions
  useEffect(() => {
    if (!orderCode || status !== 'waiting' || !isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel(`payment-order-${orderCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `order_code=eq.${orderCode}`,
        },
        (payload: any) => {
          const nextStatus = payload?.new?.status;
          if (nextStatus === 'paid' || nextStatus === 'success') {
            completeOrder();
          } else if (nextStatus === 'failed' || nextStatus === 'cancelled') {
            setStatus('failed');
          } else if (nextStatus === 'expired') {
            setStatus('expired');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderCode, status, completeOrder]);

  // Fallback Polling mỗi 3s (kèm đối soát trực tiếp với PayOS ở phía server)
  useEffect(() => {
    if (!orderCode || status !== 'waiting') return;

    let attempts = 0;
    const MAX_ATTEMPTS = 300;

    const pollInterval = setInterval(async () => {
      attempts++;
      try {
        let currentStatus = '';
        if (method === 'payos') {
          const res = await getPayOSOrderStatus(orderCode).catch(() => null);
          currentStatus = res?.isPaid ? 'paid' : res?.status || '';
        } else {
          const result = await getServicePaymentOrderStatus(String(orderCode));
          currentStatus = result?.status || '';
        }

        if (currentStatus === 'paid' || currentStatus === 'success') {
          clearInterval(pollInterval);
          completeOrder();
        } else if (
          currentStatus === 'failed' ||
          currentStatus === 'cancelled' ||
          currentStatus === 'expired' ||
          attempts >= MAX_ATTEMPTS
        ) {
          setStatus(attempts >= MAX_ATTEMPTS || currentStatus === 'expired' ? 'expired' : 'failed');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.warn('[usePaymentPolling] Poll warning:', err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [orderCode, status, method, completeOrder]);

  const recheckStatus = async () => {
    if (!orderCode) return;
    setIsChecking(true);
    try {
      let currentStatus = '';
      if (method === 'payos') {
        const res = await getPayOSOrderStatus(orderCode);
        currentStatus = res?.isPaid ? 'paid' : res?.status || '';
      } else {
        const paymentCheck = await getServicePaymentOrderStatus(String(orderCode));
        currentStatus = paymentCheck?.status || '';
      }

      if (currentStatus === 'paid' || currentStatus === 'success') {
        completeOrder();
      } else if (currentStatus === 'failed' || currentStatus === 'cancelled') {
        setStatus('failed');
        showToast('Giao dịch đã hủy hoặc thất bại', 'Vui lòng kiểm tra lại hoặc tạo mã QR mới.', 'error');
      } else if (currentStatus === 'expired') {
        setStatus('expired');
        showToast('Mã QR đã hết hạn', 'Vui lòng tạo mã thanh toán mới.', 'warning');
      } else {
        showToast(
          'Đang chờ PayOS xác nhận đủ tiền',
          'Hệ thống tự động kích hoạt ngay khi PayOS xác nhận đã nhận đủ số tiền đơn hàng.',
          'info'
        );
      }
    } catch (err: any) {
      showToast('Không thể kiểm tra trạng thái', err?.message || 'Vui lòng thử lại sau.', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const formatCountdown = () => {
    const m = Math.floor(timeLeftSeconds / 60);
    const s = timeLeftSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return {
    status,
    timeLeftSeconds,
    countdownText: formatCountdown(),
    isChecking,
    recheckStatus,
    resetPayment: () => {
      setStatus('idle');
      setTimeLeftSeconds(900);
    },
  };
}
