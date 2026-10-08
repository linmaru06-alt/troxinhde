import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, Eye, GraduationCap, RefreshCw, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { AdminConfirmModal } from './AdminConfirmModal';
import { useAppStore } from '../../store/useAppStore';
import {
  getStudentCardUrl,
  listPendingStudentVerifications,
  PendingStudentVerification,
  reviewStudentVerification,
} from '../../lib/api/verification';

const QUEUE_KEY = ['admin', 'student-verifications', 'pending'] as const;

/**
 * Hàng chờ duyệt thẻ sinh viên cho quản trị viên.
 * Ảnh thẻ nằm ở kho riêng tư, chỉ mở bằng link có thời hạn khi admin bấm xem.
 */
export const StudentVerificationQueue: React.FC = () => {
  const showToast = useAppStore((s) => s.showToast);
  const queryClient = useQueryClient();
  const [cardUrls, setCardUrls] = useState<Record<string, string>>({});
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PendingStudentVerification | null>(null);

  const { data: queue = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: QUEUE_KEY,
    queryFn: listPendingStudentVerifications,
  });

  const review = useMutation({
    mutationFn: ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) =>
      reviewStudentVerification(id, approve, reason),
    onSuccess: (_data, vars) => {
      queryClient.setQueryData<PendingStudentVerification[]>(QUEUE_KEY, (prev) => (prev || []).filter((v) => v.id !== vars.id));
      showToast(
        vars.approve ? 'Đã duyệt thẻ sinh viên 🎓' : 'Đã từ chối hồ sơ',
        vars.approve ? 'Người dùng đã nhận huy hiệu Đã xác minh sinh viên.' : 'Người dùng đã nhận thông báo kèm lý do.',
        vars.approve ? 'success' : 'info'
      );
    },
  });

  const handleViewCard = async (verification: PendingStudentVerification) => {
    setLoadingCardId(verification.id);
    try {
      const url = await getStudentCardUrl(verification.card_path);
      setCardUrls((prev) => ({ ...prev, [verification.id]: url }));
    } catch (err: any) {
      showToast('Không thể mở ảnh thẻ', err?.message || 'Vui lòng thử lại', 'error');
    } finally {
      setLoadingCardId(null);
    }
  };

  const handleApprove = async (verification: PendingStudentVerification) => {
    try {
      await review.mutateAsync({ id: verification.id, approve: true });
    } catch (err: any) {
      showToast('Không thể duyệt hồ sơ', err?.message || 'Vui lòng thử lại', 'error');
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejecting) return;
    try {
      await review.mutateAsync({ id: rejecting.id, approve: false, reason });
      setRejecting(null);
    } catch (err: any) {
      showToast('Không thể từ chối hồ sơ', err?.message || 'Vui lòng thử lại', 'error');
    }
  };

  const reviewingId = review.isPending ? review.variables?.id : undefined;

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-[#006d37]" />
          Duyệt thẻ sinh viên
          {queue.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[11px] font-black px-2 py-0.5 rounded-full">{queue.length} chờ duyệt</span>
          )}
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => refetch()}
          disabled={isFetching}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />}
        >
          Làm mới
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-gray-500 flex items-center gap-2" role="status">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang tải hàng chờ...
        </p>
      ) : error ? (
        <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {(error as Error).message}
          </span>
          <button type="button" onClick={() => refetch()} className="font-bold underline shrink-0 cursor-pointer">
            Thử lại
          </button>
        </div>
      ) : queue.length === 0 ? (
        <p className="text-xs text-gray-500">Không có hồ sơ thẻ sinh viên nào đang chờ duyệt.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {queue.map((verification) => {
            const isReviewing = reviewingId === verification.id;
            const cardUrl = cardUrls[verification.id];
            return (
              <li key={verification.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {verification.profile?.full_name || 'Người dùng Trọ Xinh'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {[verification.profile?.university, verification.profile?.student_year].filter(Boolean).join(' • ') || 'Chưa khai báo trường'}
                    {' · '}Gửi lúc {new Date(verification.submitted_at).toLocaleString('vi-VN')}
                  </p>
                  {cardUrl && (
                    <a href={cardUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
                      <img
                        src={cardUrl}
                        alt={`Thẻ sinh viên của ${verification.profile?.full_name || 'người dùng'}`}
                        className="h-32 max-w-full rounded-lg border border-gray-200 object-contain bg-gray-50"
                      />
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!cardUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleViewCard(verification)}
                      disabled={loadingCardId === verification.id}
                      leftIcon={
                        loadingCardId === verification.id
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <Eye className="w-3.5 h-3.5" />
                      }
                    >
                      Xem ảnh thẻ
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                    onClick={() => setRejecting(verification)}
                    disabled={review.isPending}
                    leftIcon={<X className="w-3.5 h-3.5" />}
                  >
                    Từ chối
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="text-xs bg-[#006d37] hover:bg-emerald-800"
                    onClick={() => handleApprove(verification)}
                    disabled={review.isPending || !cardUrl}
                    title={!cardUrl ? 'Xem ảnh thẻ trước khi duyệt' : undefined}
                    leftIcon={isReviewing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  >
                    {isReviewing ? 'Đang lưu...' : 'Duyệt'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AdminConfirmModal
        isOpen={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        onConfirm={handleRejectConfirm}
        type="custom"
        title="Từ chối xác minh sinh viên"
        description="Người dùng sẽ nhận thông báo kèm lý do để gửi lại ảnh thẻ hợp lệ."
        entityName={rejecting?.profile?.full_name || undefined}
        isLoading={review.isPending}
      />
    </section>
  );
};
