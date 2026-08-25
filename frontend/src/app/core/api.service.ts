import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Asset,
  AssetCondition,
  AssetStatus,
  Category,
  DashboardSummary,
  Employee,
  Movement,
  MovementType,
  Paginated,
  Sector,
  User,
} from './models';

export interface AssetQuery {
  [key: string]: unknown;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AssetStatus | '';
  categoryId?: string;
  sectorId?: string;
  employeeId?: string;
}

/** Cliente único da API — mantém as URLs em um só lugar. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  // ---- Estoque -------------------------------------------------------------

  listAssets(query: AssetQuery = {}): Observable<Paginated<Asset>> {
    return this.http.get<Paginated<Asset>>(`${this.base}/assets`, { params: toParams(query) });
  }

  getAsset(id: string): Observable<Asset> {
    return this.http.get<Asset>(`${this.base}/assets/${id}`);
  }

  getAssetTimeline(id: string): Observable<Movement[]> {
    return this.http.get<Movement[]>(`${this.base}/assets/${id}/timeline`);
  }

  lookupAssets(term: string): Observable<Asset[]> {
    return this.http.get<Asset[]>(`${this.base}/assets/lookup`, { params: { term } });
  }

  createAsset(body: Partial<Asset>): Observable<Asset> {
    return this.http.post<Asset>(`${this.base}/assets`, body);
  }

  updateAsset(id: string, body: Partial<Asset>): Observable<Asset> {
    return this.http.patch<Asset>(`${this.base}/assets/${id}`, body);
  }

  // ---- Movimentações -------------------------------------------------------

  listMovements(
    query: { page?: number; pageSize?: number; search?: string; type?: MovementType | '' } = {},
  ): Observable<Paginated<Movement>> {
    return this.http.get<Paginated<Movement>>(`${this.base}/movements`, {
      params: toParams(query),
    });
  }

  assign(body: {
    assetId: string;
    toEmployeeId: string;
    sectorId: string;
    notes?: string;
  }): Observable<Movement> {
    return this.http.post<Movement>(`${this.base}/movements/assignment`, body);
  }

  return(body: {
    assetId: string;
    fromEmployeeId: string;
    condition: AssetCondition;
    destination: AssetStatus;
    notes?: string;
  }): Observable<Movement> {
    return this.http.post<Movement>(`${this.base}/movements/return`, body);
  }

  changeStatus(body: {
    assetId: string;
    type: MovementType;
    destination?: AssetStatus;
    condition?: AssetCondition;
    notes?: string;
  }): Observable<Movement> {
    return this.http.post<Movement>(`${this.base}/movements/status`, body);
  }

  // ---- Compras -------------------------------------------------------------

  createPurchase(body: unknown): Observable<unknown> {
    return this.http.post(`${this.base}/purchases`, body);
  }

  listPurchases(query: { page?: number; search?: string } = {}): Observable<Paginated<unknown>> {
    return this.http.get<Paginated<unknown>>(`${this.base}/purchases`, { params: toParams(query) });
  }

  // ---- Cadastros -----------------------------------------------------------

  listSectors(query: { page?: number; pageSize?: number; search?: string } = {}) {
    return this.http.get<Paginated<Sector>>(`${this.base}/sectors`, { params: toParams(query) });
  }

  createSector(name: string) {
    return this.http.post<Sector>(`${this.base}/sectors`, { name });
  }

  updateSector(id: string, body: Partial<Sector>) {
    return this.http.patch<Sector>(`${this.base}/sectors/${id}`, body);
  }

  listCategories(query: { page?: number; pageSize?: number; search?: string } = {}) {
    return this.http.get<Paginated<Category>>(`${this.base}/categories`, {
      params: toParams(query),
    });
  }

  createCategory(name: string) {
    return this.http.post<Category>(`${this.base}/categories`, { name });
  }

  updateCategory(id: string, body: Partial<Category>) {
    return this.http.patch<Category>(`${this.base}/categories/${id}`, body);
  }

  listEmployees(query: { page?: number; pageSize?: number; search?: string; sectorId?: string } = {}) {
    return this.http.get<Paginated<Employee>>(`${this.base}/employees`, {
      params: toParams(query),
    });
  }

  createEmployee(body: Partial<Employee>) {
    return this.http.post<Employee>(`${this.base}/employees`, body);
  }

  updateEmployee(id: string, body: Partial<Employee>) {
    return this.http.patch<Employee>(`${this.base}/employees/${id}`, body);
  }

  // ---- Administração -------------------------------------------------------

  listUsers(query: { page?: number; pageSize?: number; search?: string } = {}) {
    return this.http.get<Paginated<User>>(`${this.base}/users`, { params: toParams(query) });
  }

  createUser(body: { name: string; email: string; password: string; role: string }) {
    return this.http.post<User>(`${this.base}/users`, body);
  }

  updateUser(id: string, body: Partial<User> & { password?: string }) {
    return this.http.patch<User>(`${this.base}/users/${id}`, body);
  }

  deactivateUser(id: string) {
    return this.http.delete<User>(`${this.base}/users/${id}`);
  }

  // ---- Dashboard -----------------------------------------------------------

  dashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.base}/dashboard/summary`);
  }

  dashboardRecent(): Observable<Movement[]> {
    return this.http.get<Movement[]>(`${this.base}/dashboard/recent-movements`);
  }

  dashboardAttention(): Observable<Asset[]> {
    return this.http.get<Asset[]>(`${this.base}/dashboard/needs-attention`);
  }

  dashboardByCategory(): Observable<{ categoryId: string; name: string; count: number }[]> {
    return this.http.get<{ categoryId: string; name: string; count: number }[]>(
      `${this.base}/dashboard/by-category`,
    );
  }
}

function toParams(query: Record<string, unknown>): HttpParams {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }

  return params;
}
