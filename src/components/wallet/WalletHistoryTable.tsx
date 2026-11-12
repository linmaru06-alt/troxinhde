import React, { useState } from 'react';
import { K23WalletTransaction } from '../../lib/api/k23Wallet';
import { History, ArrowDownLeft, ArrowUpRight, Sparkles } from 'lucide-react';

interface WalletHistoryTableProps {
  transactions: K23WalletTransaction[];
  isLoading?: boolean;
}

export const WalletHistoryTable: React.FC<WalletHistoryTableProps> = ({
  transactions,
  isLoading = false,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'spend'>('all');

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'all') return true;
    if (filterType === 'deposit') return tx.total_amount_xu > 0;
    return tx.total_amount_xu < 0;
  });

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <h2 className="text-base sm:text-lg font-black text-gray-950 flex items-center gap-2">
            <History className="w-5 h-5 text-[#00a854]" />
            Lịch Sử Biến Động Số Dư Xu
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {transactions.length} giao dịch được ghi nhận
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-gray-100 self-start sm:self-auto">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'deposit', label: 'Nạp / Thưởng' },
            { id: 'spend', label: 'Chi tiêu' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === tab.id
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-10 text-xs text-gray-400">
          Chưa có giao dịch Xu nào trong mục này.
        </div>
      ) : (
        <>
          {/* Bảng cho tablet / desktop (>= 640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-3 px-3 font-semibold">Loại</th>
                  <th className="py-3 px-3 font-semibold">Nội dung giao dịch</th>
                  <th className="py-3 px-3 font-semibold text-right">Số Xu</th>
                  <th className="py-3 px-3 font-semibold">Mã tham chiếu</th>
                  <th className="py-3 px-3 font-semibold">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map((tx) => {
                  const isPlus = tx.total_amount_xu > 0;
                  const isReward = tx.transaction_type === 'reward';
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 px-3">
                        {isPlus ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                              isReward
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {isReward ? (
                              <Sparkles className="w-3 h-3 text-amber-600" />
                            ) : (
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                            )}
                            {isReward ? 'Thưởng Xu' : 'Nạp Xu'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px]">
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                            Chi tiêu Xu
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 font-medium text-gray-900">{tx.reason}</td>

                      <td className="py-3.5 px-3 text-right font-mono font-black text-sm">
                        <span className={isPlus ? 'text-[#00a854]' : 'text-rose-600'}>
                          {isPlus
                            ? `+${tx.total_amount_xu.toLocaleString('vi-VN')}`
                            : tx.total_amount_xu.toLocaleString('vi-VN')}{' '}
                          Xu
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[11px] text-gray-500">
                        {tx.reference_id || '—'}
                      </td>

                      <td className="py-3.5 px-3 text-gray-500">
                        {new Date(tx.created_at).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Danh sách card tối ưu cho mobile (>= 360px) */}
          <div className="sm:hidden space-y-2.5">
            {filteredTransactions.map((tx) => {
              const isPlus = tx.total_amount_xu > 0;
              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/70 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        isPlus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isPlus ? 'Nạp / Thưởng' : 'Chi tiêu'}
                    </span>
                    <span
                      className={`font-mono font-black text-sm ${
                        isPlus ? 'text-[#00a854]' : 'text-rose-600'
                      }`}
                    >
                      {isPlus
                        ? `+${tx.total_amount_xu.toLocaleString('vi-VN')}`
                        : tx.total_amount_xu.toLocaleString('vi-VN')}{' '}
                      Xu
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-900">{tx.reason}</p>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span className="font-mono">{tx.reference_id || '—'}</span>
                    <span>{new Date(tx.created_at).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

