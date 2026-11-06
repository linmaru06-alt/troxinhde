import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import {
  getOwnerIssues,
  createK23Issue,
  updateK23IssueStatus,
  getOwnerExpenses,
  createK23Expense,
  deleteK23Expense,
  calculateNetProfit,
} from '../../lib/api/k23Operations';
import { K23Issue, K23Expense } from '../../types/k23Operations';

export function useK23Operations() {
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();
  const ownerId = currentUser?.id || 'user_owner_1';

  // 1. Query Sự cố (Issues)
  const issuesQuery = useQuery({
    queryKey: ['k23_issues', ownerId],
    queryFn: () => getOwnerIssues(ownerId),
    enabled: !!ownerId,
    staleTime: 1000 * 60 * 2,
  });

  // 2. Query Chi phí vận hành (Expenses)
  const expensesQuery = useQuery({
    queryKey: ['k23_expenses', ownerId],
    queryFn: () => getOwnerExpenses(ownerId),
    enabled: !!ownerId,
    staleTime: 1000 * 60 * 2,
  });

  // 3. Mutation Tạo sự cố mới
  const createIssueMutation = useMutation({
    mutationFn: (issue: Omit<K23Issue, 'id' | 'created_at'>) => createK23Issue(issue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['k23_issues', ownerId] });
    },
  });

  // 4. Mutation Cập nhật trạng thái sự cố
  const updateIssueStatusMutation = useMutation({
    mutationFn: ({
      issueId,
      status,
      assignedTo,
      repairCost,
    }: {
      issueId: string;
      status: K23Issue['status'];
      assignedTo?: string;
      repairCost?: number;
    }) => updateK23IssueStatus(issueId, status, assignedTo, repairCost),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['k23_issues', ownerId] });
      queryClient.invalidateQueries({ queryKey: ['k23_expenses', ownerId] });
    },
  });

  // 5. Mutation Tạo chi phí vận hành
  const createExpenseMutation = useMutation({
    mutationFn: (exp: Omit<K23Expense, 'id' | 'created_at'>) => createK23Expense(exp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['k23_expenses', ownerId] });
    },
  });

  // 6. Mutation Xóa chi phí
  const deleteExpenseMutation = useMutation({
    mutationFn: (expenseId: string) => deleteK23Expense(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['k23_expenses', ownerId] });
    },
  });

  return {
    issues: issuesQuery.data || [],
    expenses: expensesQuery.data || [],
    isLoadingIssues: issuesQuery.isLoading,
    isLoadingExpenses: expensesQuery.isLoading,
    createIssue: createIssueMutation.mutateAsync,
    updateIssueStatus: updateIssueStatusMutation.mutateAsync,
    createExpense: createExpenseMutation.mutateAsync,
    deleteExpense: deleteExpenseMutation.mutateAsync,
    calculateNetProfit,
  };
}

