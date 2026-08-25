export type Role = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export type AssetStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'MAINTENANCE'
  | 'RESERVED'
  | 'RETIRED'
  | 'DISPOSED';

export type AssetCondition = 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'INOPERATIVE';

export type MovementType =
  | 'PURCHASE_ENTRY'
  | 'ASSIGNMENT'
  | 'RETURN'
  | 'MAINTENANCE'
  | 'MAINTENANCE_RETURN'
  | 'RETIREMENT'
  | 'DISPOSAL';

export const STATUS_LABEL: Record<AssetStatus, string> = {
  AVAILABLE: 'Disponível',
  ASSIGNED: 'Em uso',
  MAINTENANCE: 'Em manutenção',
  RESERVED: 'Reservado',
  RETIRED: 'Retirado',
  DISPOSED: 'Descartado',
};

export const CONDITION_LABEL: Record<AssetCondition, string> = {
  NEW: 'Novo',
  EXCELLENT: 'Excelente',
  GOOD: 'Bom',
  FAIR: 'Regular',
  DAMAGED: 'Danificado',
  INOPERATIVE: 'Inoperante',
};

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  PURCHASE_ENTRY: 'Entrada por compra',
  ASSIGNMENT: 'Entrega',
  RETURN: 'Devolução',
  MAINTENANCE: 'Envio para manutenção',
  MAINTENANCE_RETURN: 'Retorno de manutenção',
  RETIREMENT: 'Retirada de operação',
  DISPOSAL: 'Descarte',
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
  VIEWER: 'Consulta',
};

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface Named {
  id: string;
  name: string;
}

export interface Sector extends Named {
  active: boolean;
}

export interface Category extends Named {
  active: boolean;
}

export interface Employee {
  id: string;
  name: string;
  email?: string | null;
  registration?: string | null;
  sectorId: string;
  sector?: Named;
  active: boolean;
}

export interface Asset {
  id: string;
  assetTag: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  description?: string | null;
  status: AssetStatus;
  condition: AssetCondition;
  location?: string | null;
  categoryId: string;
  category?: Named;
  currentEmployee?: Named | null;
  currentSector?: Named | null;
  createdAt: string;
  updatedAt: string;
}

export interface Movement {
  id: string;
  assetId: string;
  type: MovementType;
  condition?: AssetCondition | null;
  statusAfter: AssetStatus;
  notes?: string | null;
  createdAt: string;
  asset?: Pick<Asset, 'id' | 'assetTag' | 'model' | 'manufacturer' | 'status'>;
  fromEmployee?: Named | null;
  toEmployee?: Named | null;
  sector?: Named | null;
  performedBy?: Named;
}

export interface DashboardSummary {
  total: number;
  byStatus: Record<AssetStatus, number>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}
