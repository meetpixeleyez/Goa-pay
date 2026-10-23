import { PaginationMeta } from "./api";

export interface QRCodeItem {
  id: number | string;
  providerId: number | string;
  operatorId?: number | string | null;
  upiId: string;
  imageUrl: string;
  name: string;
  accountHolderName?: string | null;
  bankName?: string | null;
  status: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  operator?: {
    id: number | string;
    name: string;
  } | null;
  provider?: {
    id: number | string;
    name: string;
  } | null;
}

export interface OperatorItem {
  id: number | string;
  name: string;
  phone?: string | null;
  status: string;
  portalAccess: boolean;
  transactionAllowed: boolean;
  qrProviderId?: number | string | null;
  qrProvider?: {
    id: number | string;
    name: string;
  } | null;
  assignedQRCodes?: QRCodeItem[];
  createdAt: Date | string;
}

export interface QRProviderListItem {
  id: number | string;
  name: string;
  phone?: string | null;
  status: string;
  balance: number;
  exposure: number;
  availableBalance: number;
  qrProviderFee: number;
  payinQrProviderFee?: number | null;
  payoutQrProviderFee?: number | null;
  payinAgentFee?: number | null;
  payoutAgentFee?: number | null;
  agentId?: number | string | null;
  agent?: {
    id: number | string;
    name: string;
  } | null;
  qrCodes?: QRCodeItem[];
  operators?: OperatorItem[];
  _count?: {
    providerOrders?: number;
    qrCodes?: number;
    operators?: number;
  };
  createdAt: Date | string;
}

export interface QRProviderStats {
  totalProviders: number;
  activeProviders: number;
  totalBalance: number;
  totalExposure: number;
  totalAvailable: number;
  totalQRCodes: number;
  activeQRCodes: number;
}

export interface QRProviderQueryParams {
  search?: string;
  status?: string;
  agentId?: string;
  sortBy?: "name" | "balance" | "exposure" | "availableBalance" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  includeStats?: boolean;
}

export interface CreateQRProviderInput {
  name: string;
  password: string;
  phone?: string | null;
  initialBalance?: number;
  agentId?: string | null;
  payinQrProviderFee?: number;
  payoutQrProviderFee?: number;
  payinAgentFee?: number;
  payoutAgentFee?: number;
  initialUpiId?: string | null;
  initialQrImageUrl?: string | null;
  accountHolderName?: string | null;
  bankName?: string | null;
}

export interface UpdateQRProviderInput {
  name?: string;
  phone?: string | null;
  status?: string;
  portalAccess?: boolean;
  transactionAllowed?: boolean;
  agentId?: string | null;
  payinQrProviderFee?: number;
  payoutQrProviderFee?: number;
  payinAgentFee?: number;
  payoutAgentFee?: number;
  password?: string;
}

export interface CreateQRCodeInput {
  providerId?: string | number;
  operatorId?: string | number | null;
  upiId: string;
  imageUrl?: string | null;
  accountHolderName?: string | null;
  bankName?: string | null;
  isActive?: boolean;
  name?: string;
}

export interface UpdateQRCodeInput {
  upiId?: string;
  imageUrl?: string | null;
  accountHolderName?: string | null;
  bankName?: string | null;
  isActive?: boolean;
  operatorId?: string | number | null;
}

export interface CreateOperatorInput {
  name: string;
  username?: string;
  password: string;
  confirmPassword?: string;
  phone?: string | null;
  qrProviderId?: string | number;
  assignedQrIds?: (string | number)[];
  initialUpiId?: string | null;
  initialQrImageUrl?: string | null;
  accountHolderName?: string | null;
  bankName?: string | null;
}

export interface UpdateOperatorInput {
  name?: string;
  phone?: string | null;
  status?: string;
  portalAccess?: boolean;
  transactionAllowed?: boolean;
  assignedQrIds?: (string | number)[];
}
