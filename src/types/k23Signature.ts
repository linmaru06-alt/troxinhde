export interface K23ElectronicSignature {
  id: string;
  contract_id: string;
  contract_code: string;
  signer_name: string;
  signer_phone: string;
  signer_role: 'tenant' | 'owner';
  signature_data_url: string;
  signed_at: string;
  document_sha256_hash: string;
}

export interface CT01DeclarationData {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  idCardNumber: string;
  idCardDate: string;
  idCardPlace: string;
  phone: string;
  permanentAddress: string; // Quê quán thường trú
  temporaryAddress: string; // Địa chỉ tòa nhà trọ + số phòng
  landlordName: string;
  landlordPhone: string;
  leaseStartDate: string;
  leaseEndDate: string;
}

