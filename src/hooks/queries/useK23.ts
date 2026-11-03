import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getServiceCatalog,
  getBuildingServices,
  saveBuildingServices,
  getMeterReadings,
  getPreviousMeterReadings,
  saveMeterReading,
  batchSaveMeterReadings,
  getInvoices,
  getInvoiceById,
  saveInvoiceWithItems,
  updateInvoiceStatus,
  deleteInvoice,
} from '../../lib/api';
import { InvoiceStatus, Invoice, InvoiceItem } from '../../types/k23';

// ------------------- Services -------------------

export function useServiceCatalog() {
  return useQuery({
    queryKey: ['k23_service_catalog'],
    queryFn: getServiceCatalog,
    staleTime: 10 * 60 * 1000,
  });
}

export function useBuildingServices(buildingId?: string) {
  return useQuery({
    queryKey: ['k23_building_services', buildingId],
    queryFn: () => getBuildingServices(buildingId!),
    enabled: Boolean(buildingId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveBuildingServices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      buildingId: string;
      ownerId: string;
      services: Array<{ service_id: string; custom_price: number; is_active: boolean }>;
    }) => saveBuildingServices(variables.buildingId, variables.ownerId, variables.services),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['k23_building_services', variables.buildingId] });
    },
  });
}

// ------------------- Meter Readings -------------------

export function useMeterReadings(params: {
  buildingId?: string;
  roomId?: string;
  month: number;
  year: number;
}) {
  return useQuery({
    queryKey: ['k23_meter_readings', params],
    queryFn: () => getMeterReadings(params),
    enabled: Boolean(params.buildingId || params.roomId),
  });
}

export function usePreviousMeterReadings(params: {
  buildingId?: string;
  month: number;
  year: number;
}) {
  return useQuery({
    queryKey: ['k23_meter_readings_prev', params],
    queryFn: () => getPreviousMeterReadings(params),
    enabled: Boolean(params.buildingId),
  });
}

export function useSaveMeterReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveMeterReading,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['k23_meter_readings'] });
    },
  });
}

export function useBatchSaveMeterReadings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: batchSaveMeterReadings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['k23_meter_readings'] });
      queryClient.invalidateQueries({ queryKey: ['k23_invoices'] });
    },
  });
}

// ------------------- Invoices -------------------

export function useInvoices(params: {
  ownerId: string;
  buildingId?: string;
  month?: number;
  year?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: ['k23_invoices', params],
    queryFn: () => getInvoices(params),
    enabled: Boolean(params.ownerId),
  });
}

export function useInvoiceDetail(id?: string) {
  return useQuery({
    queryKey: ['k23_invoice_detail', id],
    queryFn: () => getInvoiceById(id!),
    enabled: Boolean(id),
  });
}

export function useSaveInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      invoice: Partial<Invoice>;
      items: Array<Partial<InvoiceItem>>;
    }) => saveInvoiceWithItems(variables),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['k23_invoices'] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ['k23_invoice_detail', data.id] });
      }
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      id: string;
      status: InvoiceStatus;
      paidAmount?: number;
      paymentMethod?: string;
    }) =>
      updateInvoiceStatus(
        variables.id,
        variables.status,
        variables.paidAmount,
        variables.paymentMethod
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['k23_invoices'] });
      queryClient.invalidateQueries({ queryKey: ['k23_invoice_detail', variables.id] });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['k23_invoices'] });
    },
  });
}

