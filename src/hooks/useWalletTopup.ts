import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import {
  WALLET_TOPUP_PACKS,
  WalletTopupMethod,
  WalletTopupOrder,
  calculateTopupXuPreview,
  confirmDemoWalletTopup,
  createWalletTopupOrder,
  getWallet,
  getWalletTopupStatus,
  getWalletTransactions,
} from '../lib/api/k23Wallet';

export type TopupWizardStep = 1 | 2 | 3 | 'success' | 'expired';

export function useWalletTopup() {
  const queryClient = useQueryClient();
  const { currentUser, wallet: storeWallet, walletTransactions: storeTxs, syncWalletFromServer, showToast } =
    useAppStore();

  const userId = currentUser?.id;
  const isDemoAccount = Boolean(currentUser?.isDemoAccount);

  // Trạng thái UI Wizard tạm thời (Bước 1 -> 2 -> 3 -> Hoàn tất / Hết hạn)
  const [step, setStep] = useState<TopupWizardStep>(1);
  const [selectedPackIndex, setSelectedPackIndex] = useState<number>(3); // Mặc định gói 500.000đ
  const [customXuInput, setCustomXuInput] = useState<string>('500');
  const [method, setMethod] = useState<WalletTopupMethod>('vietqr');
  const [activeOrder, setActiveOrder] = useState<WalletTopupOrder | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(900);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [isConfirmingDemo, setIsConfirmingDemo] = useState<boolean>(false);

  // Tính số tiền & số Xu xem trước cho Bước 1 & Bước 2
  const numericCustomXu = Number(customXuInput.replace(/[^0-9]/g, '')) || 0;
  const amountVnd = numericCustomXu * 1000;
  const preview = useMemo(() => calculateTopupXuPreview(amountVnd), [amountVnd]);
  const isAmountValid = numericCustomXu >= 10 && numericCustomXu <= 50000;

  // TanStack Query: Tải số dư Ví Xu từ Supabase
  const walletQuery = useQuery({
    queryKey: ['wallet', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Chưa đăng nhập');
      return await getWallet(userId);
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  // TanStack Query: Tải lịch sử biến động số dư từ Supabase
  const transactionsQuery = useQuery({
    queryKey: ['wallet-transactions', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await getWalletTransactions(userId, 50);
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  // Đồng bộ kết quả từ TanStack Query sang Zustand cache hiển thị trên Navbar/Sidebar
  useEffect(() => {
    if (!userId || !walletQuery.data) return;
    // Với tài khoản demo chưa có ví trên Supabase, giữ trải nghiệm demo nếu số dư Supabase = 0
    if (isDemoAccount && walletQuery.data.total_xu === 0 && storeWallet.total_xu > 0) {
      return;
    }
    syncWalletFromServer(walletQuery.data, transactionsQuery.data);
  }, [userId, isDemoAccount, walletQuery.data, transactionsQuery.data, storeWallet.total_xu, syncWalletFromServer]);

  const refreshWalletData = useCallback(async () => {
    if (!userId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['wallet', userId] }),
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions', userId] }),
    ]);
  }, [queryClient, userId]);

  // Mutation: Tạo đơn nạp Xu phía Server (Vercel API -> Supabase pending)
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!isAmountValid) {
        throw new Error('Số Xu nạp phải từ 10 Xu (10.000đ) đến 50.000 Xu (50.000.000đ).');
      }
      setOrderError(null);
      return await createWalletTopupOrder({ amountVnd, method });
    },
    onSuccess: (order) => {
      setActiveOrder(order);
      const msLeft = new Date(order.expiresAt).getTime() - Date.now();
      setSecondsLeft(Math.max(1, Math.floor(msLeft / 1000)));
      setStep(3);
    },
    onError: (err: any) => {
      const msg = err?.message || 'Không thể khởi tạo đơn nạp Xu. Vui lòng thử lại.';
      setOrderError(msg);
      showToast('Không thể tạo đơn nạp Xu', msg, 'error');
    },
  });

  const handleOrderPaid = useCallback(
    async (paidOrderCode: string, creditedTotal?: number) => {
      setStep('success');
      await refreshWalletData();
      showToast(
        'Nạp Trọ Xinh Xu thành công!',
        creditedTotal
          ? `Đơn #${paidOrderCode} đã hoàn tất (+${creditedTotal.toLocaleString('vi-VN')} Xu).`
          : `Đơn #${paidOrderCode} đã được ghi nhận vào ví của bạn.`,
        'success'
      );
    },
    [refreshWalletData, showToast]
  );

  // Đồng hồ đếm ngược 15 phút ở Bước 3
  useEffect(() => {
    if (step !== 3 || !activeOrder) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(activeOrder.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        setStep('expired');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [step, activeOrder]);

  // Supabase Realtime + Polling dự phòng 3.5 giây khi đang chờ quét QR (Bước 3)
  useEffect(() => {
    if (step !== 3 || !activeOrder || !userId) return;

    let stopped = false;

    const checkOnce = async () => {
      try {
        const res = await getWalletTopupStatus(activeOrder.orderCode);
        if (stopped) return;
        if (res.status === 'paid' || res.status === 'success') {
          stopped = true;
          await handleOrderPaid(activeOrder.orderCode, activeOrder.totalXu);
        } else if (res.status === 'expired') {
          stopped = true;
          setStep('expired');
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời trong chu kỳ polling tự động
      }
    };

    const pollTimer = setInterval(checkOnce, 3500);

    let channel: any = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel(`wallet_topup_${activeOrder.orderCode}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `order_code=eq.${activeOrder.orderCode}`,
          },
          (payload: any) => {
            const newStatus = payload?.new?.status;
            if ((newStatus === 'paid' || newStatus === 'success') && !stopped) {
              stopped = true;
              handleOrderPaid(activeOrder.orderCode, activeOrder.totalXu);
            } else if (newStatus === 'expired' && !stopped) {
              stopped = true;
              setStep('expired');
            }
          }
        )
        .subscribe();
    }

    return () => {
      stopped = true;
      clearInterval(pollTimer);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [step, activeOrder, userId, handleOrderPaid]);

  // Nút "Kiểm tra lại trạng thái" (Read-only từ server)
  const recheckStatus = useCallback(async () => {
    if (!activeOrder) return;
    setIsCheckingStatus(true);
    setOrderError(null);
    try {
      const res = await getWalletTopupStatus(activeOrder.orderCode);
      if (res.status === 'paid' || res.status === 'success') {
        await handleOrderPaid(activeOrder.orderCode, activeOrder.totalXu);
      } else if (res.status === 'expired') {
        setStep('expired');
        showToast('Đơn nạp đã hết hạn', 'Vui lòng tạo mã QR mới để tiếp tục.', 'warning');
      } else {
        showToast(
          'Đang chờ ngân hàng/MoMo xác nhận',
          'Hệ thống chưa nhận được tín hiệu chuyển khoản cho mã đơn này. Vui lòng đợi 1-3 phút và thử lại.',
          'info'
        );
      }
    } catch (err: any) {
      const msg = err?.message || 'Không thể kiểm tra trạng thái đơn hàng.';
      setOrderError(msg);
      showToast('Kiểm tra trạng thái thất bại', msg, 'error');
    } finally {
      setIsCheckingStatus(false);
    }
  }, [activeOrder, handleOrderPaid, showToast]);

  // Nút xác nhận dành riêng cho Demo Sandbox
  const confirmDemoTopup = useCallback(async () => {
    if (!activeOrder || !isDemoAccount) return;
    setIsConfirmingDemo(true);
    setOrderError(null);
    try {
      await confirmDemoWalletTopup(activeOrder.orderCode);
      await handleOrderPaid(activeOrder.orderCode, activeOrder.totalXu);
    } catch (err: any) {
      const msg = err?.message || 'Không thể hoàn tất giao dịch Sandbox.';
      setOrderError(msg);
      showToast('Lỗi nạp thử nghiệm Demo', msg, 'error');
    } finally {
      setIsConfirmingDemo(false);
    }
  }, [activeOrder, isDemoAccount, handleOrderPaid, showToast]);

  const selectPack = (index: number) => {
    const pack = WALLET_TOPUP_PACKS[index];
    if (!pack) return;
    setSelectedPackIndex(index);
    setCustomXuInput(String(pack.realXu));
    setOrderError(null);
  };

  const handleCustomXuChange = (rawVal: string) => {
    const digitsOnly = rawVal.replace(/[^0-9]/g, '');
    setCustomXuInput(digitsOnly);
    const xuNum = Number(digitsOnly) || 0;
    const matchedIdx = WALLET_TOPUP_PACKS.findIndex((p) => p.realXu === xuNum);
    setSelectedPackIndex(matchedIdx);
    setOrderError(null);
  };

  const resetWizard = () => {
    setActiveOrder(null);
    setOrderError(null);
    setStep(1);
    setSecondsLeft(900);
  };

  const formatCountdown = () => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Chọn ví hiển thị ưu tiên dữ liệu thật từ Supabase (trừ Demo account fallback)
  const effectiveWallet =
    isDemoAccount && (!walletQuery.data || walletQuery.data.total_xu === 0)
      ? storeWallet
      : walletQuery.data || storeWallet;

  const effectiveTransactions =
    isDemoAccount && (!transactionsQuery.data || transactionsQuery.data.length === 0)
      ? storeTxs
      : transactionsQuery.data || storeTxs;

  return {
    currentUser,
    isDemoAccount,
    wallet: effectiveWallet,
    transactions: effectiveTransactions,
    isLoadingWallet: walletQuery.isLoading,
    walletLoadError: walletQuery.error ? (walletQuery.error as Error).message : null,
    refreshWalletData,

    // Wizard state & controls
    step,
    setStep,
    selectedPackIndex,
    selectPack,
    customXuInput,
    handleCustomXuChange,
    numericCustomXu,
    amountVnd,
    preview,
    isAmountValid,
    method,
    setMethod,
    activeOrder,
    orderError,
    countdownText: formatCountdown(),
    isCreatingOrder: createOrderMutation.isPending,
    createOrder: () => createOrderMutation.mutate(),
    isCheckingStatus,
    recheckStatus,
    isConfirmingDemo,
    confirmDemoTopup,
    resetWizard,
  };
}

