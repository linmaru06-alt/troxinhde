// =====================================================================
// K23 PMS — PHASE 4: SIÊU HỆ SINH THÁI THÔNG MINH
// P3-06: VNeID & Cổng Dịch Vụ Công Cư Trú Modal
// =====================================================================

import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  FileCode,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import {
  VneidTenantStayRecord,
  VneidDeclarationExport,
} from '../../../types/k23Vneid';
import {
  validateCccdNumber,
  generateVneidXmlContent,
  generateVneidJsonContent,
  generateVneidCsvContent,
  downloadVneidExportFile,
} from '../../../utils/k23VneidExporter';

interface VneidDeclarationModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingName?: string;
  buildingAddress?: string;
  tenants?: Array<{
    id: string;
    fullName: string;
    phone: string;
    cccdNumber?: string;
    roomNumber: string;
    startDate: string;
    endDate: string;
    hometown?: string;
  }>;
}

const DEFAULT_DEMO_RECORDS: VneidTenantStayRecord[] = [
  {
    id: 'st_1',
    roomNumber: 'P.101',
    contractCode: 'HD-2026-P101',
    cccdNumber: '001202018899',
    fullName: 'Lê Hoàng Nam',
    dateOfBirth: '15/08/2002',
    gender: 'Nam',
    nationality: 'Việt Nam',
    ethnicity: 'Kinh',
    permanentAddress: 'Xã Tân Hội, Huyện Đan Phượng, Hà Nội',
    phone: '0988123456',
    stayAddress: 'Số 12 Ngõ 68 Triều Khúc, Phường Thanh Xuân Nam, Quận Thanh Xuân, Hà Nội',
    arrivalDate: '01/11/2026',
    expectedDepartureDate: '01/11/2027',
    stayReason: 'Thuê nhà để ở',
    status: 'valid',
  },
  {
    id: 'st_2',
    roomNumber: 'P.202',
    contractCode: 'HD-2026-P202',
    cccdNumber: '038301019922',
    fullName: 'Nguyễn Thị Mai',
    dateOfBirth: '20/11/2001',
    gender: 'Nữ',
    nationality: 'Việt Nam',
    ethnicity: 'Kinh',
    permanentAddress: 'Phường Hưng Dũng, Thành phố Vinh, Nghệ An',
    phone: '0977222333',
    stayAddress: 'Số 12 Ngõ 68 Triều Khúc, Phường Thanh Xuân Nam, Quận Thanh Xuân, Hà Nội',
    arrivalDate: '15/10/2026',
    expectedDepartureDate: '15/10/2027',
    stayReason: 'Học tập',
    status: 'valid',
  },
  {
    id: 'st_3',
    roomNumber: 'P.304',
    contractCode: 'HD-2026-P304',
    cccdNumber: '022203001122',
    fullName: 'Trần Minh Đức',
    dateOfBirth: '10/05/2003',
    gender: 'Nam',
    nationality: 'Việt Nam',
    ethnicity: 'Kinh',
    permanentAddress: 'Phường Bạch Đằng, Thành phố Hạ Long, Quảng Ninh',
    phone: '0912888999',
    stayAddress: 'Số 12 Ngõ 68 Triều Khúc, Phường Thanh Xuân Nam, Quận Thanh Xuân, Hà Nội',
    arrivalDate: '01/11/2026',
    expectedDepartureDate: '01/05/2027',
    stayReason: 'Thuê nhà để ở',
    status: 'valid',
  },
];

export const VneidDeclarationModal: React.FC<VneidDeclarationModalProps> = ({
  isOpen,
  onClose,
  buildingName = 'Tòa Nhà Xanh Trọ Xinh',
  buildingAddress = 'Số 12 Ngõ 68 Triều Khúc, Thanh Xuân, Hà Nội',
}) => {
  const [records, setRecords] = useState<VneidTenantStayRecord[]>(DEFAULT_DEMO_RECORDS);
  const [selectedFormat, setSelectedFormat] = useState<'xml' | 'json' | 'csv'>('xml');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Thẩm định hồ sơ
  const auditResults = useMemo(() => {
    let validCount = 0;
    let invalidCount = 0;

    const validated = records.map((r) => {
      const cccdCheck = validateCccdNumber(r.cccdNumber);
      const errors: string[] = [];
      if (!cccdCheck.isValid) errors.push(cccdCheck.error || 'CCCD không hợp lệ');
      if (!r.fullName) errors.push('Thiếu họ tên');
      if (!r.arrivalDate) errors.push('Thiếu ngày đến');

      if (errors.length === 0) {
        validCount++;
        return { ...r, status: 'valid' as const, validationErrors: [] };
      } else {
        invalidCount++;
        return { ...r, status: 'missing_info' as const, validationErrors: errors };
      }
    });

    return { validated, validCount, invalidCount };
  }, [records]);

  if (!isOpen) return null;

  const exportPayload: VneidDeclarationExport = {
    exportId: `EXP_VNEID_${Date.now()}`,
    buildingName,
    buildingAddress,
    ward: 'Phường Thanh Xuân Nam',
    district: 'Quận Thanh Xuân',
    city: 'Thành phố Hà Nội',
    landlordName: 'Trần Quốc Tuấn',
    landlordPhone: '0999000002',
    landlordCccd: '001085002234',
    createdDate: new Date().toISOString().split('T')[0],
    totalRecords: records.length,
    records,
  };

  const handleDownload = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (selectedFormat === 'xml') {
      const xml = generateVneidXmlContent(exportPayload);
      downloadVneidExportFile(xml, `KhaiBaoLuuTru_VNeID_${timestamp}.xml`, 'application/xml');
    } else if (selectedFormat === 'json') {
      const json = generateVneidJsonContent(exportPayload);
      downloadVneidExportFile(json, `KhaiBaoLuuTru_VNeID_${timestamp}.json`, 'application/json');
    } else {
      const csv = generateVneidCsvContent(exportPayload);
      downloadVneidExportFile(csv, `BangKeKhaiBaoLuuTru_${timestamp}.csv`, 'text/csv');
    }

    setDownloadSuccess(`Đã xuất thành công tệp ${selectedFormat.toUpperCase()}! Bạn có thể nộp trực tuyến lên Cổng DVC.`);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-red-700 via-rose-800 to-red-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5 fill-amber-300 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 text-white px-2.5 py-0.5 rounded-full border border-white/20">
                  K23 PMS • P3-06 (Pro)
                </span>
                <span className="text-xs text-rose-200 font-bold">Cổng Dịch Vụ Công Cư Trú</span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">
                Khai Báo Lưu Trú VNeID & Cổng DVC Bộ Công An
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nội dung */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Banner hướng dẫn pháp lý */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="font-black text-amber-950 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Quy định khai báo lưu trú theo Luật Cư trú 2020:</span>
              </div>
              <p className="text-amber-900 leading-relaxed text-[11px]">
                Chủ cơ sở cho thuê phải thông báo lưu trú với công an cấp xã/phường trước 23h trong ngày khách đến ở.
                Hệ thống K23 tự động chuẩn hóa hồ sơ XML để nộp trực tuyến qua mạng mà không cần đến trực tiếp trụ sở công an.
              </p>
            </div>
            <a
              href="https://dvc.dancuquocgia.gov.vn"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <span>Mở Cổng DVC Quốc Gia ↗</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Thống kê tính hợp lệ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 font-bold block">Tổng số khách thuê</span>
              <span className="text-xl font-black text-slate-900">{records.length} người</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
              <span className="text-emerald-700 font-bold block">✓ Đủ điều kiện xuất XML</span>
              <span className="text-xl font-black text-emerald-800">{auditResults.validCount} hồ sơ</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
              <span className="text-rose-700 font-bold block">Cần bổ sung thông tin</span>
              <span className="text-xl font-black text-rose-800">{auditResults.invalidCount} hồ sơ</span>
            </div>
          </div>

          {/* Bảng danh sách khách thuê cần thông báo lưu trú */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Danh Sách Khách Thuê Tòa Nhà ({buildingName})
            </h3>

            <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold text-[11px] border-b border-slate-200">
                    <th className="p-3">Phòng</th>
                    <th className="p-3">Số CCCD (12 số)</th>
                    <th className="p-3">Họ và tên</th>
                    <th className="p-3">Ngày sinh</th>
                    <th className="p-3">Thường trú</th>
                    <th className="p-3">Ngày đến</th>
                    <th className="p-3">Lý do lưu trú</th>
                    <th className="p-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditResults.validated.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{item.roomNumber}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">{item.cccdNumber}</td>
                      <td className="p-3 font-black text-slate-950 uppercase">{item.fullName}</td>
                      <td className="p-3 text-slate-600">{item.dateOfBirth} ({item.gender})</td>
                      <td className="p-3 text-slate-600 max-w-[200px] truncate" title={item.permanentAddress}>
                        {item.permanentAddress}
                      </td>
                      <td className="p-3 font-semibold text-slate-700">{item.arrivalDate}</td>
                      <td className="p-3 text-slate-600">{item.stayReason}</td>
                      <td className="p-3 text-center">
                        {item.status === 'valid' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hợp lệ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> Thiếu số
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chọn định dạng xuất file */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <label className="text-xs font-bold text-slate-700 block">
              Chọn Định Dạng Xuất File Khai Báo Lưu Trú:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedFormat('xml')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                  selectedFormat === 'xml'
                    ? 'border-red-500 bg-red-50/50 ring-2 ring-red-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <FileCode className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <div className="text-xs font-black text-slate-900">File XML (.xml)</div>
                  <div className="text-[10px] text-slate-500">Chuẩn nộp Cổng DVC Cư Trú</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('json')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                  selectedFormat === 'json'
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <div className="text-xs font-black text-slate-900">File JSON (.json)</div>
                  <div className="text-[10px] text-slate-500">Tích hợp API phần mềm</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('csv')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                  selectedFormat === 'csv'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-black text-slate-900">Bảng kê Excel / CSV</div>
                  <div className="text-[10px] text-slate-500">Lưu trữ hồ sơ nội bộ</div>
                </div>
              </button>
            </div>

            {downloadSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{downloadSuccess}</span>
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              className="w-full bg-red-700 hover:bg-red-800 text-white font-bold"
              onClick={handleDownload}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Tải Xuống Tệp Khai Báo {selectedFormat.toUpperCase()} ({auditResults.validCount} Khách)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
