/**
 * Chuyển đổi số tiền thành chữ tiếng Việt chuẩn kế toán
 * Ví dụ: 5821000 -> "Năm triệu tám trăm hai mươi mốt nghìn đồng"
 */
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readGroupOfThree(group: number, showZeroHundred: boolean = true): string {
  const hundred = Math.floor(group / 100);
  const ten = Math.floor((group % 100) / 10);
  const unit = group % 10;

  let result = '';

  if (hundred > 0 || showZeroHundred) {
    result += `${DIGITS[hundred]} trăm `;
  }

  if (ten > 1) {
    result += `${DIGITS[ten]} mươi `;
    if (unit === 1) {
      result += 'mốt ';
    } else if (unit === 5) {
      result += 'lăm ';
    } else if (unit > 0) {
      result += `${DIGITS[unit]} `;
    }
  } else if (ten === 1) {
    result += 'mười ';
    if (unit === 5) {
      result += 'lăm ';
    } else if (unit > 0) {
      result += `${DIGITS[unit]} `;
    }
  } else if (hundred > 0 || showZeroHundred) {
    if (unit > 0) {
      result += `lẻ ${DIGITS[unit]} `;
    }
  } else if (unit > 0) {
    result += `${DIGITS[unit]} `;
  }

  return result.trim();
}

export function convertNumberToVietnameseWords(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) {
    return 'Không đồng';
  }

  const isNegative = amount < 0;
  let num = Math.abs(Math.round(amount));

  const groups: number[] = [];
  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  const SCALES = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const parts: string[] = [];

  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = groups[i];
    if (groupVal > 0) {
      const showZeroHundred = i < groups.length - 1;
      const groupWords = readGroupOfThree(groupVal, showZeroHundred);
      const scale = SCALES[i];
      parts.push(`${groupWords} ${scale}`.trim());
    }
  }

  let text = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (text) {
    text = text.charAt(0).toUpperCase() + text.slice(1) + ' đồng';
  } else {
    text = 'Không đồng';
  }

  return isNegative ? `Âm ${text.charAt(0).toLowerCase() + text.slice(1)}` : text;
}
