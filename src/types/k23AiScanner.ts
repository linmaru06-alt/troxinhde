export type MeterScanType = 'electricity' | 'water';

export interface AiMeterScanResult {
  detectedValue: number;
  confidenceScore: number; // 0.85 ➔ 0.99 (85% ➔ 99%)
  meterType: MeterScanType;
  capturedImageUrl: string;
  rawDigits: string;
  processingTimeMs: number;
  scannedAt: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface MeterScanCandidate {
  value: number;
  confidence: number;
}
