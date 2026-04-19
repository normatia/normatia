export interface NormatiaConfig {
  apiKey: string;
  baseUrl?: string;
}

export type LocationLevel = "municipality" | "province" | "autonomous_community";

export interface LocationSearchParams {
  q: string;
  level?: LocationLevel;
  ancestor_id?: string;
}

export interface Ancestor {
  geo_id: string;
  name: string;
  level: LocationLevel | string;
}

export interface ApplicableCode {
  slug: string;
  title: string;
  short_title?: string;
  normative_scope?: string;
  version?: string;
}

export interface LocationResult {
  geo_id: string;
  name: string;
  level: LocationLevel | string;
  ancestors?: Ancestor[];
}

export interface LocationDetail {
  geo_id: string;
  name: string;
  level: LocationLevel | string;
  ancestors: Ancestor[];
  tech_data: Record<string, unknown>;
  applicable_codes: ApplicableCode[];
}

export interface CodeSearchParams {
  q?: string;
  normative_scope?: string;
  tag?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CodeResult {
  slug: string;
  title: string;
  short_title?: string;
  description?: string;
  normative_scope?: string;
  tags?: string[];
  country_code?: string;
}

export interface DocumentVersion {
  version: string;
  title?: string;
  status?: string;
  published_date?: string;
  effective_date?: string;
  description?: string;
  author?: string;
  source_url?: string;
}

export interface CodeDetail {
  slug: string;
  title: string;
  short_title?: string;
  description?: string;
  normative_scope: string;
  tags?: string[];
  country_code: string;
  documents: DocumentVersion[];
}

export interface Section {
  id?: string;
  title: string;
  content?: string;
  order?: number;
  sections?: Section[];
}

export interface CodeVersionDetail {
  slug: string;
  version: string;
  title: string;
  status: string;
  published_date?: string;
  effective_date?: string;
  description?: string;
  author?: string;
  source_url?: string;
  sections: Section[];
}

export interface CodeReference {
  slug: string;
  version?: string;
}

export interface Source {
  slug?: string;
  version?: string;
  title?: string;
  section_id?: string;
  section_title?: string;
  excerpt?: string;
  source_url?: string;
  [key: string]: unknown;
}

export interface GeoContext {
  geo_id: string;
  name?: string;
  level?: LocationLevel | string;
  ancestors?: Ancestor[];
  [key: string]: unknown;
}

export interface AskRequest {
  query: string;
  geo_id?: string;
  codes?: CodeReference[];
}

export interface AskResponse {
  answer: string;
  sources: Source[];
  geo_context?: GeoContext;
}

export interface VerifyRequest {
  element: string;
  parameter: string;
  value: number;
  unit: string;
  geo_id: string;
  codes?: CodeReference[];
  context?: string;
}

export interface VerifyResponse {
  result_status: string;
  element: string;
  parameter: string;
  provided_value: number;
  limit_value: number;
  unit: string;
  conditions?: string[];
  warnings?: string[];
  sources: Source[];
  geo_context: GeoContext;
}
