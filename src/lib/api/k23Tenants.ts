import { supabase, isSupabaseConfigured } from '../supabase';
import { resolveUserIdToUuid } from './messages';
import { K23Tenant, K23Contract, CreateContractParams } from '../../types/k23Tenants';

// -------------------------------------------------------------------------
// MOCK DATA MẪU CHUẨN THỰC TẾ (Dành cho Demo & Offline Mode)
// -------------------------------------------------------------------------
const INITIAL_MOCK_TENANTS: K23Tenant[] = [
  {
    id: 't_302',
    owner_id: 'user_owner_1',
    full_name: 'Nguyễn Văn An',
    phone: '0988 123 456',
    email: 'an.nguyen@gmail.com',
    id_card_number: '001201012345',
    id_card_date: '2021-05-12',
    id_card_place: 'Cục CS QLHC về TTXH',
    hometown: 'Thái Bình',
    vehicle_plate: '17B2-688.99',
    id_card_front_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
    id_card_back_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
    notes: 'Sinh viên năm 3 ĐH Bách Khoa, ngoan ngoãn, đóng tiền đúng hạn.',
    created_at: '2026-08-01T08:00:00Z',
  },
  {
    id: 't_303',
    owner_id: 'user_owner_1',
    full_name: 'Lê Thị Thu Mai',
    phone: '0977 654 321',
    email: 'thumai.le@gmail.com',
    id_card_number: '034199008877',
    id_card_date: '2022-08-20',
    id_card_place: 'Cục CS QLHC về TTXH',
    hometown: 'Hải Dương',
    vehicle_plate: '34C1-345.67',
    id_card_front_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    notes: 'Nhân viên văn phòng, giữ gìn phòng sạch sẽ.',
    created_at: '2025-11-25T09:00:00Z',
  },
  {
    id: 't_304',
    owner_id: 'user_owner_1',
    full_name: 'Trần Minh Đức',
    phone: '0912 888 999',
    email: 'duc.tran@outlook.com',
    id_card_number: '022203001122',
    id_card_date: '2023-01-10',
    id_card_place: 'Cục CS QLHC về TTXH',
    hometown: 'Quảng Ninh',
    vehicle_plate: '14A-123.88',
    notes: 'Kinh doanh tự do, hay về muộn.',
    created_at: '2026-05-10T10:00:00Z',
  },
];

const INITIAL_MOCK_CONTRACTS: K23Contract[] = [
  {
    id: 'contract_302',
    contract_code: 'HD-2026-P302',
    owner_id: 'user_owner_1',
    room_id: 'room_1',
    tenant_id: 't_302',
    start_date: '2026-08-01',
    end_date: '2027-08-01', // Còn 9 tháng
    rent_amount: 4200000,
    deposit_amount: 4200000,
    payment_cycle_months: 1,
    payment_due_day: 5,
    status: 'active',
    notes: 'Hợp đồng 1 năm, cọc 1 tháng tiền nhà.',
    created_at: '2026-08-01T08:30:00Z',
    room: {
      id: 'room_1',
      room_number: 'P.302',
      title: 'Phòng Studio Ban Công Thoáng Mát',
      building_id: 'bld_1',
      building_name: 'Tòa Nhà Xanh Cầu Giấy',
    },
    tenant: INITIAL_MOCK_TENANTS[0],
  },
  {
    id: 'contract_303',
    contract_code: 'HD-2025-P303',
    owner_id: 'user_owner_1',
    room_id: 'room_2',
    tenant_id: 't_303',
    start_date: '2025-11-25',
    end_date: '2026-11-25', // Sắp hết hạn (còn 19 ngày)
    rent_amount: 3800000,
    deposit_amount: 3800000,
    payment_cycle_months: 1,
    payment_due_day: 5,
    status: 'expiring_soon',
    notes: 'Cần liên hệ khách để hỏi gia hạn thêm 1 năm.',
    created_at: '2025-11-25T09:30:00Z',
    room: {
      id: 'room_2',
      room_number: 'P.303',
      title: 'Phòng Studio Đầy Đủ Nội Thất',
      building_id: 'bld_1',
      building_name: 'Tòa Nhà Xanh Cầu Giấy',
    },
    tenant: INITIAL_MOCK_TENANTS[1],
  },
  {
    id: 'contract_304',
    contract_code: 'HD-2026-P304',
    owner_id: 'user_owner_1',
    room_id: 'room_3',
    tenant_id: 't_304',
    start_date: '2026-05-01',
    end_date: '2026-11-01', // Đã hết hạn (quá hạn 5 ngày)
    rent_amount: 3500000,
    deposit_amount: 3500000,
    payment_cycle_months: 1,
    payment_due_day: 5,
    status: 'expired',
    notes: 'Đã hết hạn hợp đồng 6 tháng. Chờ khách ký tiếp hoặc thanh lý.',
    created_at: '2026-05-01T10:00:00Z',
    room: {
      id: 'room_3',
      room_number: 'P.304',
      title: 'Phòng Đơn Tiện Nghi Ban Công',
      building_id: 'bld_1',
      building_name: 'Tòa Nhà Xanh Cầu Giấy',
    },
    tenant: INITIAL_MOCK_TENANTS[2],
  },
];

// Bộ nhớ đệm cục bộ
let localTenants: K23Tenant[] = [...INITIAL_MOCK_TENANTS];
let localContracts: K23Contract[] = [...INITIAL_MOCK_CONTRACTS];

/**
 * Lấy danh sách hợp đồng của chủ trọ (kèm tự động tính trạng thái sắp hết hạn)
 */
export async function getOwnerContracts(ownerId: string): Promise<K23Contract[]> {
  if (!ownerId) return [];

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 1. Thử lấy từ Supabase nếu có
  if (isSupabaseConfigured) {
    try {
      const cleanOwnerId = await resolveUserIdToUuid(ownerId);
      const { data, error } = await supabase
        .from('k23_contracts')
        .select(`
          *,
          tenant:k23_tenants(*)
        `)
        .eq('owner_id', cleanOwnerId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((c: any) => {
          const endDate = new Date(c.end_date);
          let calculatedStatus: any = c.status;
          if (c.status === 'active') {
            if (endDate < now) {
              calculatedStatus = 'expired';
            } else if (endDate <= thirtyDaysLater) {
              calculatedStatus = 'expiring_soon';
            }
          }
          return {
            ...c,
            status: calculatedStatus,
          };
        });
      }
    } catch {
      // fallback mock
    }
  }

  // 2. Fallback mock data cục bộ
  return localContracts.map((c) => {
    const endDate = new Date(c.end_date);
    let calculatedStatus: any = c.status;
    if (c.status !== 'terminated') {
      if (endDate < now) {
        calculatedStatus = 'expired';
      } else if (endDate <= thirtyDaysLater) {
        calculatedStatus = 'expiring_soon';
      } else {
        calculatedStatus = 'active';
      }
    }
    return {
      ...c,
      status: calculatedStatus,
    };
  });
}

/**
 * Lấy danh bạ khách thuê của chủ trọ
 */
export async function getOwnerTenants(ownerId: string): Promise<K23Tenant[]> {
  if (!ownerId) return [];

  if (isSupabaseConfigured) {
    try {
      const cleanOwnerId = await resolveUserIdToUuid(ownerId);
      const { data, error } = await supabase
        .from('k23_tenants')
        .select('*')
        .eq('owner_id', cleanOwnerId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      // fallback
    }
  }

  return localTenants;
}

/**
 * P0-03: Kiểm tra phòng đã có hợp đồng Active chưa (Chống đặt trùng phòng)
 */
export async function checkRoomIsOccupied(roomId: string): Promise<{
  isOccupied: boolean;
  currentContract?: K23Contract;
}> {
  const activeContract = localContracts.find(
    (c) => c.room_id === roomId && (c.status === 'active' || c.status === 'expiring_soon')
  );

  if (activeContract) {
    return { isOccupied: true, currentContract: activeContract };
  }

  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from('k23_contracts')
        .select('*, tenant:k23_tenants(*)')
        .eq('room_id', roomId)
        .eq('status', 'active')
        .maybeSingle();

      if (data) {
        return { isOccupied: true, currentContract: data as any };
      }
    } catch {
      // ignore
    }
  }

  return { isOccupied: false };
}

/**
 * Tạo Hợp đồng thuê phòng mới & Đăng ký hồ sơ khách thuê
 */
export async function createK23Contract(params: CreateContractParams): Promise<{
  success: boolean;
  contract?: K23Contract;
  error?: string;
}> {
  try {
    // 1. Kiểm tra chống trùng phòng (P0-03)
    const checkOccupancy = await checkRoomIsOccupied(params.room_id);
    if (checkOccupancy.isOccupied) {
      return {
        success: false,
        error: `Phòng này đang có hợp đồng hoạt động (Khách thuê: ${checkOccupancy.currentContract?.tenant?.full_name || 'Khách'}). Vui lòng thanh lý hợp đồng cũ trước!`,
      };
    }

    // 2. Tạo hoặc gán Tenant
    let tenantId = params.tenant_id;
    let tenantObj: K23Tenant | undefined;

    if (!tenantId) {
      tenantId = `tenant_${Date.now()}`;
      tenantObj = {
        id: tenantId,
        owner_id: params.owner_id,
        full_name: params.tenant_name,
        phone: params.tenant_phone,
        email: params.tenant_email,
        id_card_number: params.tenant_id_card,
        id_card_date: params.tenant_id_card_date,
        id_card_place: params.tenant_id_card_place,
        hometown: params.tenant_hometown,
        vehicle_plate: params.tenant_vehicle_plate,
        id_card_front_url: params.tenant_id_front_url,
        id_card_back_url: params.tenant_id_back_url,
        created_at: new Date().toISOString(),
      };
      localTenants.unshift(tenantObj);

      if (isSupabaseConfigured) {
        try {
          const cleanOwnerId = await resolveUserIdToUuid(params.owner_id);
          await supabase.from('k23_tenants').insert({
            ...tenantObj,
            owner_id: cleanOwnerId,
          });
        } catch {
          // ignore
        }
      }
    } else {
      tenantObj = localTenants.find((t) => t.id === tenantId);
    }

    // 3. Tạo Hợp đồng
    const contractCode = `HD-${new Date().getFullYear()}-${params.room_id.replace(/\D/g, '') || Math.floor(100 + Math.random() * 900)}`;
    const newContract: K23Contract = {
      id: `contract_${Date.now()}`,
      contract_code: contractCode,
      owner_id: params.owner_id,
      room_id: params.room_id,
      tenant_id: tenantId,
      start_date: params.start_date,
      end_date: params.end_date,
      rent_amount: params.rent_amount,
      deposit_amount: params.deposit_amount,
      payment_cycle_months: params.payment_cycle_months || 1,
      payment_due_day: params.payment_due_day || 5,
      status: 'active',
      notes: params.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tenant: tenantObj,
    };

    localContracts.unshift(newContract);

    if (isSupabaseConfigured) {
      try {
        const cleanOwnerId = await resolveUserIdToUuid(params.owner_id);
        await supabase.from('k23_contracts').insert({
          contract_code: newContract.contract_code,
          owner_id: cleanOwnerId,
          room_id: newContract.room_id,
          tenant_id: newContract.tenant_id,
          start_date: newContract.start_date,
          end_date: newContract.end_date,
          rent_amount: newContract.rent_amount,
          deposit_amount: newContract.deposit_amount,
          payment_cycle_months: newContract.payment_cycle_months,
          payment_due_day: newContract.payment_due_day,
          status: newContract.status,
          notes: newContract.notes,
        });

        // Cập nhật trạng thái phòng sang Đã cho thuê
        await supabase
          .from('rooms')
          .update({
            status: 'rented',
            current_tenant_name: params.tenant_name,
            current_tenant_phone: params.tenant_phone,
          })
          .eq('id', params.room_id);
      } catch {
        // ignore
      }
    }

    return {
      success: true,
      contract: newContract,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Lỗi khi tạo hợp đồng thuê phòng',
    };
  }
}

/**
 * Gia hạn hợp đồng thêm N tháng (1-chạm)
 */
export async function renewK23Contract(
  contractId: string,
  additionalMonths: number
): Promise<{ success: boolean; newEndDate?: string; error?: string }> {
  try {
    const contract = localContracts.find((c) => c.id === contractId);
    if (!contract) {
      return { success: false, error: 'Không tìm thấy hợp đồng' };
    }

    const currentEnd = new Date(contract.end_date);
    const newEnd = new Date(currentEnd.setMonth(currentEnd.getMonth() + additionalMonths));
    const newEndStr = newEnd.toISOString().split('T')[0];

    contract.end_date = newEndStr;
    contract.status = 'active';
    contract.updated_at = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('k23_contracts')
          .update({
            end_date: newEndStr,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', contractId);
      } catch {
        // ignore
      }
    }

    return { success: true, newEndDate: newEndStr };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Thanh lý hợp đồng thuê phòng (Chấm dứt hợp đồng)
 */
export async function terminateK23Contract(contractId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const contract = localContracts.find((c) => c.id === contractId);
    if (!contract) {
      return { success: false, error: 'Không tìm thấy hợp đồng' };
    }

    contract.status = 'terminated';
    contract.updated_at = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('k23_contracts')
          .update({
            status: 'terminated',
            updated_at: new Date().toISOString(),
          })
          .eq('id', contractId);

        // Trả phòng về Còn trống
        await supabase
          .from('rooms')
          .update({
            status: 'available',
            current_tenant_name: null,
            current_tenant_phone: null,
          })
          .eq('id', contract.room_id);
      } catch {
        // ignore
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

