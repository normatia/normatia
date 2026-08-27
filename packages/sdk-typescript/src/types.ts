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

/**
 * @deprecated Body of the frozen `POST /api/v1/ask`. Use {@link AskV2Request}.
 *
 * The endpoint no longer accepts `geo_id`, `codes` or `messages`: the scope of a
 * query comes from its project. Sending any of them returns 422.
 */
export interface AskRequest {
  query: string;
}

/** @deprecated Response of the frozen `POST /api/v1/ask`. Use {@link AskV2Response}. */
export interface AskResponse {
  answer: string;
  sources: Source[];
  geo_context?: GeoContext;
}

/**
 * Body of `POST /api/v2/ask`.
 *
 * There is no geography or code filter: the municipality, the applicable
 * regulations and the uploaded documents all come from the project. Omit
 * `project_id` to query the user's active project.
 */
export interface AskV2Request {
  query: string;
  project_id?: string;
}

/** A source cited in an agentic answer. `index` is the N of each `[N]` marker. */
export interface AskV2Source {
  index: number;
  citation_type: "article" | "document" | "collection" | "user_document" | string;
  document_title: string;
  section_title?: string | null;
  block_title?: string | null;
  /** Absent for `user_document`: private project files have no public URL. */
  url?: string | null;
  url_valid: boolean;
  block_id?: string | null;
}

/** The project a query was resolved against. */
export interface AskV2Project {
  project_id: string;
  geo_id?: string | null;
  location?: string | null;
}

export interface AskV2Response {
  answer: string;
  sources: AskV2Source[];
  project?: AskV2Project;
  /** Reasoning rounds the turn consumed. */
  iterations: number;
  /** Regulatory searches the agent ran. */
  searches: number;
}

/** A project in the list returned by `GET /api/v1/projects`. */
export interface ProjectListItem {
  project_id: string;
  name: string;
  description?: string | null;
  geo_id?: string | null;
  location?: string | null;
  collection_count: number;
  file_count: number;
  /** The project used when no `project_id` is passed. */
  is_active: boolean;
}

export interface ProjectListResponse {
  projects: ProjectListItem[];
  total: number;
}

export interface ProjectGeoContext {
  geo_id: string;
  name: string;
  level: string;
  ancestors: string;
  climate_zone?: string | null;
  /** Readable summary of the territory's tech data: climate, wind, snow, seismic… */
  tech_data_summary: string;
}

export interface ProjectCollection {
  slug: string;
  title: string;
  scope: string;
  scope_label: string;
  /** Current edition in force. The only valid answer to which version applies. */
  version?: string | null;
}

/** Regulation applicable to the territory that the project has NOT selected. */
export interface ProjectUnselectedCollection {
  slug?: string | null;
  title?: string | null;
  scope?: string | null;
}

export interface ProjectGeneratedDocument {
  titulo?: string | null;
  tipo?: string | null;
  version?: number | null;
}

/** A fact the user recorded about their building. */
export interface ProjectMemoryFact {
  key?: string | null;
  label?: string | null;
  value?: string | null;
  unit?: string | null;
  source?: string | null;
}

export interface ProjectCalculation {
  calculation_id: string;
  calculator_id?: string | null;
  name?: string | null;
  summary?: string | null;
  compliant?: boolean | null;
}

export interface ProjectCalculator {
  calculator_id?: string | null;
  title?: string | null;
}

/** Full context of a project — the same context the agentic engine works from. */
export interface ProjectInfoResponse {
  project_id: string;
  name?: string | null;
  is_active: boolean;
  project_description: string;
  geo_context?: ProjectGeoContext | null;
  collection_count: number;
  file_count: number;
  files: string[];
  collections: ProjectCollection[];
  unselected_collections: ProjectUnselectedCollection[];
  generated_documents: ProjectGeneratedDocument[];
  memory: ProjectMemoryFact[];
  calculations: ProjectCalculation[];
  available_calculators: ProjectCalculator[];
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
