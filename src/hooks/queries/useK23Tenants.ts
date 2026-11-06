import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import {
  getOwnerContracts,
  getOwnerTenants,
  createK23Contract,
  renewK23Contract,
  terminateK23Contract,
} from '../../lib/api/k23Tenants';
import { CreateContractParams } from '../../types/k23Tenants';

export function useK23Tenants() {
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();
  const ownerId = currentUser?.id || 'user_owner_1';

  // 1. Fetch Danh sách Hợp đồng
  const contractsQuery = useQuery({
    queryKey: ['k23_contracts', ownerId],
    queryFn: () => getOwnerContracts(ownerId),
    enabled: !!ownerId,
    staleTime: 1000 * 60 * 2, // 2 mins
  });

  // 2. Fetch Danh bạ Khách thuê
  const tenantsQuery = useQuery({
    queryKey: ['k23_tenants', ownerId],
    queryFn: () => getOwnerTenants(ownerId),
    enabled: !!ownerId,
    staleTime: 1000 * 60 * 5,
  });

  // 3. Mutation Tạo Hợp đồng mới
  const createContractMutation = useMutation({
    mutationFn: (params: CreateContractParams) => createK23Contract(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['k23_contracts', ownerId] });
      queryClient.invalidateQueries({ queryKey: ['k23_tenants', ownerId] });
    },
  });

  // 4. Mutation Gia hạn Hợp đồng
  const renewContractMutation = useMutation({
    mutationFn: ({ contractId, additionalMonths }: { contractId: string; additionalMonths: number }) =>
      renewK23Contract(contractId, additionalMonths),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['k23_contracts', ownerId] });
    },
  });

  // 5. Mutation Thanh lý Hợp đồng
  const terminateContractMutation = useMutation({
    mutationFn: (contractId: string) => terminateK23Contract(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['k23_contracts', ownerId] });
    },
  });

  return {
    contracts: contractsQuery.data || [],
    tenants: tenantsQuery.data || [],
    isLoadingContracts: contractsQuery.isLoading,
    isLoadingTenants: tenantsQuery.isLoading,
    createContract: createContractMutation.mutateAsync,
    renewContract: renewContractMutation.mutateAsync,
    terminateContract: terminateContractMutation.mutateAsync,
    isCreating: createContractMutation.isPending,
    isRenewing: renewContractMutation.isPending,
    isTerminating: terminateContractMutation.isPending,
  };
}

