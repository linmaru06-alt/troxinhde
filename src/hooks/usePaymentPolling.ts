import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkPaymentStatus } from '../lib/payos';
import { recordSuccessfulPayment } from '../lib/api/payments';
import { useAppStore } from '../store/useAppStore';
import { PaymentMethod, SubscriptionPlanId } from '../types';

export function usePaymentPolling(
  orderCode: number | string | null,
  planId: string,
  totalAmount: number,
  method: PaymentMethod = 'vietqr',
  onSuccess?: () => void
) {
  const [status, setStatus] = useState<'idle' | 'waiting' | 'success' | 'failed' | 'expired'>('idle');
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(900); // 15 minutes = 900s
  const navigate = useNavigate();
  const { upgradeSubscription, currentUser, showToast } = useAppStore();

  // Countdown 15 minutes timer
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

  // Polling check every 3s
  useEffect(() => {
    if (!orderCode || status !== 'waiting') return;

    let attempts = 0;
    const MAX_ATTEMPTS = 200; // 200 * 3s = 10 minutes

    const pollInterval = setInterval(async () => {
      attempts++;
      const result = await checkPaymentStatus(orderCode);

      if (result.status === 'success') {
        setStatus('success');
        clearInterval(pollInterval);
        const userId = currentUser?.id || '00000000-0000-0000-0000-000000000002';
        recordSuccessfulPayment(userId, orderCode, planId, totalAmount, method).then();
        upgradeSubscription(planId as SubscriptionPlanId, method, totalAmount);
        showToast('🎉 Thanh toán thành công!', `Gói dịch vụ #${orderCode} đã được kích hoạt.`, 'success');
        if (onSuccess) onSuccess();
        setTimeout(() => {
          navigate(
            `/thanh-toan/ket-qua?orderId=${orderCode}&amount=${totalAmount}&plan=${planId}&method=${method}&status=success`
          );
        }, 1500);
      } else if (result.status === 'failed' || attempts >= MAX_ATTEMPTS) {
        setStatus(attempts >= MAX_ATTEMPTS ? 'expired' : 'failed');
        clearInterval(pollInterval);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [orderCode, status, planId, totalAmount, method, navigate, upgradeSubscription, currentUser, showToast, onSuccess]);

  const triggerManualSuccess = async () => {
    if (!orderCode) return;

    showToast('Đang kiểm tra giao dịch...', 'Hệ thống đang kiểm tra giao dịch với ngân hàng/MoMo...', 'info');

    // Kiểm tra trực tiếp với Gateway / Supabase
    let isConfirmed = false;
    if (method === 'momo') {
      const momoStatus = await checkPaymentStatus(orderCode);
      isConfirmed = momoStatus.status === 'success';
    } else {
      const payosStatus = await checkPaymentStatus(orderCode);
      isConfirmed = payosStatus.status === 'success';
    }

    // Nếu đã nhận được tiền từ Webhook / IPN
    if (isConfirmed) {
      setStatus('success');
      const userId = currentUser?.id || '00000000-0000-0000-0000-000000000002';
      recordSuccessfulPayment(userId, orderCode, planId, totalAmount, method).then();
      upgradeSubscription(planId as SubscriptionPlanId, method, totalAmount);
      showToast('🎉 Thanh toán thành công!', `Gói dịch vụ đã được kích hoạt.`, 'success');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        navigate(
          `/thanh-toan/ket-qua?orderId=${orderCode}&amount=${totalAmount}&plan=${planId}&method=${method}&status=success`
        );
      }, 1200);
    } else {
      // Đang đối soát
      showToast(
        '⏳ Đang chờ xác nhận từ MoMo/Ngân hàng',
        'Giao dịch của bạn đang được hệ thống tự động đối soát (thường mất 5-30 giây). Trang sẽ tự động chuyển khi nhận được tiền!',
        'info'
      );
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
    triggerManualSuccess,
    resetPayment: () => {
      setStatus('idle');
      setTimeLeftSeconds(900);
    },
  };
}
