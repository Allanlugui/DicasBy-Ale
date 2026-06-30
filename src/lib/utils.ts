import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Order, CompanySettings, UserProfile } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateStorageFee(
  order: Order,
  settings: CompanySettings | null,
  customerProfile: UserProfile | null
): number {
  if (!order.customDeliveryRequested) return 0;
  
  const isOnDemand = order.items.some(item => item.product.stockType === 'PARTNER_STORE');
  if (!isOnDemand) return 0;

  if (customerProfile?.isStorageFeeExempt) return 0;

  const gracePeriod = customerProfile?.customStorageGracePeriodDays ?? settings?.storageGracePeriodDays ?? 3;
  const ratePerKg = settings?.storageFeePerVolumetricKgPerDayBRL ?? 5;

  let totalDaysInStorage = 0;
  const now = new Date();
  
  if (order.storedAtUS) {
    const startUS = new Date(order.storedAtUS);
    const start = order.storedAtBR ? new Date(Math.min(startUS.getTime(), new Date(order.storedAtBR).getTime())) : startUS;
    const diffMs = now.getTime() - start.getTime();
    totalDaysInStorage = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } else if (order.storedAtBR) {
    const start = new Date(order.storedAtBR);
    const diffMs = now.getTime() - start.getTime();
    totalDaysInStorage = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  const billableDays = Math.max(0, totalDaysInStorage - gracePeriod);
  if (billableDays <= 0) return 0;

  let totalVolumetricWeight = 0;
  
  if (order.packageDimensions && order.packageWeight) {
    const volWeight = (order.packageDimensions.length * order.packageDimensions.width * order.packageDimensions.height) / 5000;
    const physWeight = order.packageWeight / 1000;
    totalVolumetricWeight = Math.max(volWeight, physWeight);
  } else {
    order.items.forEach(item => {
      const length = item.product.boxLength || 20;
      const width = item.product.boxWidth || 15;
      const height = item.product.boxHeight || 10;
      const weight = item.product.boxWeight || 500;
      
      const volWeight = (length * width * height) / 5000;
      const physWeight = weight / 1000;
      totalVolumetricWeight += Math.max(volWeight, physWeight) * item.quantity;
    });
  }

  return billableDays * totalVolumetricWeight * ratePerKg;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function calculateCRC16(payload: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    const charCode = payload.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      const bit = ((charCode >> (7 - j)) & 1) === 1;
      const c15 = ((crc >> 15) & 1) === 1;
      crc = (crc << 1) & 0xFFFF;
      if (c15 !== bit) {
        crc ^= polynomial;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function cleanPixKey(key: string): string {
  const trimmed = key.trim();
  
  // 1. Email Pix Key: Contains "@"
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase().replace(/[^a-z0-9@._-]/g, '');
  }
  
  // 2. CPF / CNPJ or phone number formatting
  const digitsAndPlus = trimmed.replace(/[^0-9+]/g, '');
  const onlyDigits = digitsAndPlus.replace(/[^0-9]/g, '');
  
  // Check if it represents a Brazilian phone number
  // Format should start with +55, e.g. +5511999999999
  if (digitsAndPlus.startsWith('+') || (onlyDigits.length >= 10 && onlyDigits.length <= 11) || ((onlyDigits.length === 12 || onlyDigits.length === 13) && onlyDigits.startsWith('55'))) {
    if (onlyDigits.length === 10 || onlyDigits.length === 11) {
      return `+55${onlyDigits}`;
    }
    return `+${onlyDigits}`;
  }
  
  // CPF / CNPJ
  if (onlyDigits.length === 11 || onlyDigits.length === 14) {
    return onlyDigits;
  }
  
  // Random Key (Chave Aleatória - UUID)
  if (trimmed.includes('-')) {
    return trimmed.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  return trimmed.replace(/[^a-zA-Z0-9@.+-]/g, '');
}

export function generatePixCode(key: string, name: string, city: string, amount: number, txid: string = '***'): string {
  const cleanKey = cleanPixKey(key);
  const cleanName = (name || 'DICAS BY ALE')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .substring(0, 25) || 'DICAS BY ALE';

  const cleanCity = (city || 'SAO PAULO')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .substring(0, 15) || 'SAO PAULO';

  const cleanTxid = txid === '***' 
    ? '***' 
    : (txid || '***')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 25) || '***';

  const keyLen = cleanKey.length.toString().padStart(2, '0');
  const merchantAccountInfo = `0014br.gov.bcb.pix01${keyLen}${cleanKey}`;
  const merchantAccountInfoLen = merchantAccountInfo.length.toString().padStart(2, '0');

  const formattedAmount = amount.toFixed(2);
  const amountLen = formattedAmount.length.toString().padStart(2, '0');

  const nameLen = cleanName.length.toString().padStart(2, '0');
  const cityLen = cleanCity.length.toString().padStart(2, '0');

  const txidLen = cleanTxid.length.toString().padStart(2, '0');
  const additionalData = `05${txidLen}${cleanTxid}`;
  const additionalDataLen = additionalData.length.toString().padStart(2, '0');

  const part1 = "000201";
  const part2 = `26${merchantAccountInfoLen}${merchantAccountInfo}`;
  const part3 = "52040000";
  const part4 = "5303986";
  const part5 = `54${amountLen}${formattedAmount}`;
  const part6 = "5802BR";
  const part7 = `59${nameLen}${cleanName}`;
  const part8 = `60${cityLen}${cleanCity}`;
  const part9 = `62${additionalDataLen}${additionalData}`;
  const part10 = "6304";

  const payload = `${part1}${part2}${part3}${part4}${part5}${part6}${part7}${part8}${part9}${part10}`;
  const crc = calculateCRC16(payload);
  return `${payload}${crc}`;
}

export function generateTrackingId() {
  return 'TRK' + Math.random().toString(36).substring(2, 9).toUpperCase();
}

export function generateCarrierTrackingCode(carrier: string): string {
  const c = (carrier || "").toLowerCase();
  const randNum = () => Math.floor(100000000 + Math.random() * 900000000).toString();
  if (c.includes("fedex")) return `FX${randNum()}US`;
  if (c.includes("dhl")) return `DHL${randNum()}BR`;
  if (c.includes("ups")) return `1Z${randNum()}`;
  if (c.includes("usps")) return `9400${randNum()}`;
  return `BR${randNum()}US`;
}

export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        result[key] = cleanUndefined(val);
      }
    }
    return result;
  }
  return obj;
}

export async function safeCopyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("navigator.clipboard failed, trying fallback", err);
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return !!successful;
  } catch (err) {
    console.error("Fallback copy failed", err);
    return false;
  }
}

class SafeLocalStorage {
  private memoryStorage: Record<string, string> = {};
  private isAvailable: boolean;

  constructor() {
    try {
      const testKey = "__storage_test__";
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      this.isAvailable = true;
    } catch (e) {
      this.isAvailable = false;
    }
  }

  getItem(key: string): string | null {
    if (this.isAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        // fallback
      }
    }
    return this.memoryStorage[key] !== undefined ? this.memoryStorage[key] : null;
  }

  setItem(key: string, value: string): void {
    if (this.isAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        // fallback
      }
    }
    this.memoryStorage[key] = String(value);
  }

  removeItem(key: string): void {
    if (this.isAvailable) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        // fallback
      }
    }
    delete this.memoryStorage[key];
  }

  clear(): void {
    if (this.isAvailable) {
      try {
        window.localStorage.clear();
        return;
      } catch (e) {
        // fallback
      }
    }
    this.memoryStorage = {};
  }
}

export const safeStorage = new SafeLocalStorage();

export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, "");
  
  if (cleanCPF.length !== 11) return false;
  
  // Rule out known invalid CPFs (e.g., all same digits)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Calculate first digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Calculate second digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

export function validateCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, "");
  
  if (cleanCNPJ.length !== 14) return false;
  
  // Rule out known invalid CNPJs (e.g., all same digits)
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Validate first verification digit
  let size = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, size);
  const digits = cleanCNPJ.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let results = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (results !== parseInt(digits.charAt(0))) return false;
  
  // Validate second verification digit
  size = size + 1;
  numbers = cleanCNPJ.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  results = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (results !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

export function validateDocument(doc: string): { isValid: boolean; type: "CPF" | "CNPJ" | "INVALID" } {
  const clean = doc.replace(/\D/g, "");
  if (clean.length === 11) {
    return { isValid: validateCPF(clean), type: "CPF" };
  } else if (clean.length === 14) {
    return { isValid: validateCNPJ(clean), type: "CNPJ" };
  }
  return { isValid: false, type: "INVALID" };
}



