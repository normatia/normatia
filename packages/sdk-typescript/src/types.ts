export interface NormatiaConfig {
  apiKey: string;
  baseUrl?: string;
}

/** Geographic level of a location, as the API returns it. */
export type LocationLevel = "country" | "region" | "province" | "municipality";

export interface LocationSearchParams {
  /** Text to look for in the name. Case- and accent-insensitive. */
  q: string;
  level?: LocationLevel;
  /** Only search inside this geography, e.g. `ES-41` (province of Sevilla). */
  ancestor_id?: string;
}

export interface Ancestor {
  geo_id: string;
  name: string;
  level: LocationLevel | string;
}

/** A regulation that applies to a location. */
export interface ApplicableCode {
  slug: string;
  title: string;
  normative_scope: string;
  /** `direct` when attached to this same location, `inherited` when it comes from an ancestor. */
  match_reason: "direct" | "inherited" | string;
}

export interface LocationResult {
  geo_id: string;
  name: string;
  level: LocationLevel | string;
}

export interface LocationDetail {
  geo_id: string;
  name: string;
  level: LocationLevel | string;
  /** Ancestors from the widest (country) to the closest. */
  ancestors: Ancestor[];
  /** Territory tech data (climate_zone, altitude_m, wind_zone, ...); `null` when there is none. */
  tech_data: Record<string, unknown> | null;
  applicable_codes: ApplicableCode[];
}

export interface CodeSearchParams {
  /** Text to look for in the title. */
  q?: string;
  /** national | regional | provincial | municipal | sectoral | supramunicipal | european */
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
  short_title?: string | null;
  normative_scope: string;
  tags?: string[] | null;
}

/** A document (version) of a regulation, as listed in {@link CodeDetail}. */
export interface DocumentVersion {
  version: string;
  title: string;
  /** active | repealed | draft | in_progress */
  status: string;
  published_date?: string | null;
  effective_date?: string | null;
  /** `true` when the text is loaded in Normatia and can be queried with `askV2`. */
  is_internal: boolean;
}

export interface CodeDetail {
  slug: string;
  title: string;
  short_title?: string | null;
  description?: string | null;
  normative_scope: string;
  tags?: string[] | null;
  country_code: string;
  /** Versions of the regulation, those in force first. */
  documents: DocumentVersion[];
}

export interface CodeReference {
  slug: string;
  /**
   * Accepted by the API but currently ignored: verification always searches the
   * versions in force.
   */
  version?: string;
}

/** A source of the frozen `POST /api/v1/ask`. */
export interface Source {
  index: number;
  citation_type?: string;
  code_slug?: string;
  version?: string | null;
  document_title?: string | null;
  section_title?: string | null;
  block_title?: string | null;
  block_id?: string | null;
  url?: string | null;
  similarity_score?: number | null;
  [key: string]: unknown;
}

/** Location used to resolve a verification or a frozen v1 question. */
export interface GeoContext {
  geo_id: string;
  name: string;
  climate_zone?: string | null;
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
  geo_context?: GeoContext | null;
  tokens_used?: number | null;
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

/** Full context of a project: the same context the agentic engine works from. */
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

/**
 * Body of `POST /api/v1/verify`.
 *
 * `geo_id` must be the location of the user's active project on normatia.com;
 * otherwise the API answers 422 `geo_id_mismatch` (or 400 `no_active_project`).
 */
export interface VerifyRequest {
  element: string;
  parameter: string;
  /** Must be greater than or equal to 0. */
  value: number;
  unit: string;
  geo_id: string;
  /** Restrict the search to these regulations (among those that apply to the location). */
  codes?: CodeReference[];
  /** Accepted by the API but currently not used in the evaluation. */
  context?: string;
}

/** A source cited by a verification. */
export interface VerifySource {
  index: number;
  code_slug: string;
  version?: string | null;
  document_title?: string | null;
  section_title?: string | null;
  url?: string | null;
}

export interface VerifyResponse {
  is_compliant: boolean;
  /** compliant | conditional | non_compliant | undetermined */
  result_status: "compliant" | "conditional" | "non_compliant" | "undetermined" | string;
  element: string;
  parameter: string;
  provided_value: number;
  /** `null` when the limit is not quantifiable or was not found. */
  limit_value: number | null;
  unit: string;
  conditions: string[];
  warnings: string[];
  sources: VerifySource[];
  geo_context: GeoContext | null;
}

/** `GET /v1/me`: the key, its organization and its limits. */
export interface MeResponse {
  key: {
    id: string;
    name: string | null;
    /** Last characters of the key, as shown in Mi cuenta > Claves API. */
    hint: string;
    created_at: string;
    last_used_at: string | null;
  };
  user: { id: string; email: string | null };
  /** `null` when the user is no longer a member of the key's organization. */
  organization: {
    id: string;
    name: string;
    plan: string;
    api_enabled: boolean;
    mcp_enabled: boolean;
  } | null;
  rate_limits: {
    data_per_minute: number;
    intelligence_per_minute: number;
    mcp_per_minute: number;
  };
  quota: Quota;
}

/** Credits left this month. Without a monthly cap, `unlimited` is true and `remaining` null. */
export interface Quota {
  unlimited: boolean;
  remaining: number | null;
  resets_at: string | null;
}

export interface UsageParams {
  /** First day, YYYY-MM-DD (UTC). Defaults to the first day of the current month. */
  from?: string;
  /** Last day, included, YYYY-MM-DD (UTC). Defaults to today. */
  to?: string;
}

export interface UsageRow {
  calls: number;
  credits: number;
  /** Calls that ended in a 4xx or 5xx status. */
  errors: number;
}

/** `GET /v1/usage`: calls and credits between two dates. */
export interface UsageResponse {
  /** `organization`: every key of the organization; `key`: only this key. */
  scope: "organization" | "key";
  organization_id: string | null;
  from: string;
  to: string;
  totals: UsageRow;
  by_endpoint: Array<UsageRow & { endpoint: string }>;
  by_day: Array<UsageRow & { date: string }>;
  this_key: UsageRow;
  quota: Quota;
}

export type ParcelInclude = "constraints" | "zoning" | "buildings" | "geometry";

/** One constraint layer. `affected: null` means no data, never "not affected". */
export interface ParcelConstraintLayer {
  layer: string;
  affected: boolean | null;
  status: "affected" | "partially_affected" | "context" | "not_affected" | "no_data";
  label?: string | null;
  summary?: string | null;
  distance_m?: number | null;
  warnings?: string[];
  reason?: string | null;
  source?: string | null;
}

export interface ParcelPlanningSource {
  source?: string | null;
  date?: string | null;
  instrument?: string | null;
}

export interface ParcelZone extends ParcelPlanningSource {
  code: string;
  name?: string | null;
  percent: number;
  global_use?: string | null;
  typology?: string | null;
  parameters: Record<string, { value?: number | null; unit?: string | null; text?: string | null }>;
}

/** `GET /v1/parcels/{ref}`. Blocks not requested in `include` are null. */
export interface Parcel {
  object: "parcel";
  ref: string;
  place: { geo_id: string; ine: string; name?: string | null };
  cadastral_class: { code: "urban" | "rustic"; label: string } | null;
  main_use: string | null;
  area_m2: number | null;
  centroid: { lat: number; lon: number } | null;
  bbox: [number, number, number, number] | null;
  addresses: Array<{ street: string; number?: string | null; postal_code?: string | null }>;
  constraints: {
    summary: { affected: number; context: number; not_affected: number; no_data: number };
    layers: ParcelConstraintLayer[];
  } | null;
  zoning: {
    land_class: (ParcelPlanningSource & { label: string }) | null;
    zone: ParcelZone | null;
    other_zones: Array<{ code: string; name?: string | null; percent: number }>;
    areas: Array<{ code: string; name?: string | null; instrument?: string | null; percent: number }>;
    zone_from_other_municipality: boolean;
    contrast_land_class: (ParcelPlanningSource & { label: string }) | null;
  } | null;
  buildings: {
    built: boolean;
    condition?: string | null;
    year_built?: number | null;
    built_area_m2?: number | null;
    dwellings?: number | null;
    units?: number | null;
    floors_above?: number | null;
    floors_below?: number | null;
    source: string;
  } | null;
  /** GeoJSON MultiPolygon in WGS84, with include=geometry. */
  geometry: { type: string; coordinates: unknown } | null;
  disclaimer: string;
}

