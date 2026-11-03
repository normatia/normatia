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
    /** `test`: a sandbox key (`sk-normatia-test-`), which only answers with the sandbox. */
    mode: "live" | "test";
    name: string | null;
    /** Last characters of the key, as shown in Mi cuenta > Claves API. */
    hint: string;
    /**
     * What the key may do: `data` (reads, free), `ask` (queries, use the organization's quota) and `mcp` (the MCP
     * server). A route without its scope answers `403 insufficient_scope`.
     */
    scopes: Array<"data" | "ask" | "mcp">;
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
    /**
     * Data and MCP requests of the whole organization, adding up all its keys. It applies on top of the key's own
     * limits; a 429 caused by it has `group: "organization"` (`RateLimitError.group`).
     */
    organization_per_minute: number;
  };
  quota: Quota;
}

/** One of the user's keys in `GET /v1/keys`, active or revoked. */
export interface KeyListItem {
  id: string;
  mode: "live" | "test";
  name: string | null;
  /** Last characters of the key. */
  hint: string;
  scopes: Array<"data" | "ask" | "mcp">;
  status: "active" | "revoked";
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  /** True for the key making this call. */
  current: boolean;
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

export type ParcelInclude = "constraints" | "zoning" | "buildings" | "units" | "geometry";

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
  /** Cadastral units, with include=units. Never staircase, floor or door. */
  units: {
    total: number;
    by_use: Record<string, number>;
    data: Array<{
      ref: string;
      use?: string | null;
      area_m2?: number | null;
      year_built?: number | null;
      address?: string | null;
      postal_code?: string | null;
    }>;
    has_more: boolean;
    source?: string | null;
    date?: string | null;
    note: string;
  } | null;
  /** GeoJSON MultiPolygon in WGS84, with include=geometry. */
  geometry: { type: string; coordinates: unknown } | null;
  disclaimer: string;
}

/** `GET /v1/parcels?lat=&lon=`: the parcel containing the point, or those within 50 m. */
export interface ParcelsAtPoint {
  object: "list";
  data: Array<{ ref: string; contains_point: boolean; distance_m: number | null }>;
  has_more: boolean;
}

/** Whether a candidate matches what was written. `null`: that part was not written. */
export interface AddressMatch {
  municipality: boolean | null;
  number: boolean | null;
}

/** A parcel found from an address: the parcel of one of its entrances (portales). */
export interface ParcelAtAddress {
  /** Cadastral reference of the parcel, 14 characters. */
  ref: string;
  /** The address found: "Calle Mayor 5, Madrid". */
  address: string | null;
  place: { geo_id: string; ine: string; name: string | null } | null;
  /** The point of the entrance. */
  location: { lat: number; lon: number } | null;
  /** `confirmed`: the reference is the entrance's; `unconfirmed`: an approximation worth checking. */
  confidence: "confirmed" | "unconfirmed";
  match: AddressMatch;
}

/** What was understood from the written address. */
export interface AddressInterpretation {
  street: string | null;
  number: string | null;
  municipality: string | null;
  province: string | null;
}

/**
 * Why an address search is not exact: `not_understood` (the text could not be read as an address) is not the same as
 * `no_candidates` (it was understood and does not exist).
 */
export type AddressSearchReason =
  | "municipality_mismatch"
  | "number_mismatch"
  | "foral_territory"
  | "no_reference"
  | "no_candidates"
  | "ambiguous"
  | "not_understood";

/** `GET /v1/parcels?address=`: the parcels of an address, with what was understood and, if not exact, why. */
export interface ParcelsAtAddress {
  object: "list";
  data: ParcelAtAddress[];
  has_more: boolean;
  /** `true`: the address leads to one parcel without doubt. `false`: pick one in `data` or rephrase it. */
  exact: boolean;
  interpreted: AddressInterpretation | null;
  /** `null` when `exact` is true. */
  reason: AddressSearchReason | null;
  /** Other ways to write the address, when it was not understood. */
  suggestions: string[];
}

/** One suggestion of `GET /v1/addresses`. */
export interface AddressSuggestion {
  /** `street`: a street without number (keep typing). `address`: an entrance, with its parcel in `ref`. */
  type: "street" | "address";
  /** What to show: "Calle Habana, Sudamérica (El Puerto de Santa María)". */
  text: string;
  place: { geo_id: string; ine: string; name: string | null } | null;
  /** Province name. */
  province: string | null;
  postal_code: string | null;
  /** Only with `type: "address"`: cadastral reference of the entrance's parcel, 14 characters. */
  ref: string | null;
  /** The point of the street or of the entrance. */
  location: { lat: number; lon: number } | null;
}

/** `GET /v1/addresses?q=`: address autocomplete. */
export interface AddressSuggestions {
  object: "list";
  data: AddressSuggestion[];
  has_more: boolean;
}

/** `GET /v1/layers`: a constraint layer with its sources and licenses. */
export interface Layer {
  code: string;
  name: string;
  group: string | null;
  mode: "intersects" | "distance" | "raster" | string;
  distance_m: number | null;
  informative: boolean;
  declared_coverage: string | null;
  provinces_without_data: string[];
  sources: Array<{
    dataset: string;
    organization: string | null;
    license: string | null;
    attribution: string | null;
    catalog_url: string | null;
    verified_at: string | null;
  }>;
}

export type CoverageStatus = "complete" | "partial" | "no_data";

/** `GET /v1/coverage?place=`: what is loaded for a municipality. */
export interface Coverage {
  object: "coverage";
  place: { geo_id: string; ine: string; name: string | null };
  cadastre: { parcels: CoverageStatus; buildings: CoverageStatus; units: CoverageStatus; addresses: CoverageStatus };
  planning: Array<{ dataset: string; organization: string | null; version: string | null; status: CoverageStatus }>;
  layers: Array<{
    code: string;
    name: string;
    status: CoverageStatus;
    sources: Array<{ dataset: string; organization?: string | null; version: string | null; status: CoverageStatus }>;
  }>;
  summary: { complete: number; partial: number; no_data: number };
}

export interface RegulationVersion {
  version: string;
  title: string;
  status: "active" | "repealed" | "draft" | "in_progress" | string | null;
  published_date: string | null;
  effective_date: string | null;
  /** Whether Normatia has its text (contents and sections). */
  has_text: boolean;
  /** Text reviewed by hand. `false` with text: converted automatically and unreviewed; check it against `source_url`. */
  curated: boolean;
  source_url: string | null;
}

export interface Regulation {
  object: "regulation";
  slug: string;
  title: string;
  short_title: string | null;
  scope: "national" | "regional" | "municipal" | string | null;
  tags: string[];
  current_version: RegulationVersion | null;
}

export interface RegulationDetail extends Regulation {
  description: string | null;
  versions: RegulationVersion[];
  related_documents: Array<{
    slug: string;
    title: string;
    type: string;
    status: string | null;
    published_date: string | null;
    source_url: string | null;
  }>;
}

export interface RegulationListParams {
  q?: string;
  scope?: "national" | "regional" | "municipal";
  tag?: string;
  /** `ES-` plus the INE code: regulations that apply there. */
  place?: string;
  /** `true`: only regulations with hand-curated text. `false`: automatic text or no text. */
  curated?: boolean;
  limit?: number;
  cursor?: string;
}

export interface RegulationList {
  object: "list";
  data: Regulation[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface RegulationContents {
  object: "contents";
  regulation: string;
  version: RegulationVersion;
  source_url: string | null;
  sections: Array<{ slug: string; title: string | null; order: number }>;
}

export interface RegulationSection {
  object: "section";
  regulation: string;
  version: RegulationVersion;
  slug: string;
  title: string | null;
  blocks: Array<{
    slug: string | null;
    parent: string | null;
    type: string;
    level: number | null;
    title: string | null;
    text: string | null;
    html: string | null;
  }>;
}

export type PlaceLevel = "country" | "region" | "province" | "municipality";

/** A municipality, province, region or Spain, with the id used across the API (`ES-41091`, `ES-41`, `ES-C01`). */
export interface Place {
  object: "place";
  geo_id: string;
  ine: string | null;
  /** As the INE writes it: "Puerto de Santa María, El". */
  name: string;
  /** For display, article first: "El Puerto de Santa María". */
  display_name: string;
  level: PlaceLevel;
  province: { geo_id: string; name: string } | null;
  region: { geo_id: string; name: string } | null;
}

export interface PlaceSearchParams {
  q: string;
  level?: Exclude<PlaceLevel, "country">;
  /** Only places inside this one (`ES-41`, `ES-C01`). */
  within?: string;
  limit?: number;
}

/** Where a technical datum comes from; `regulation` is its slug in `/v1/regulations`, if it is in the catalog. */
export interface TechnicalSource {
  citation: string;
  regulation: string | null;
}

export interface PlaceTechnicalData {
  climate_zone: { value: string | null; source: TechnicalSource };
  design_temperatures: { winter_p99_c: number | null; summer_p1_c: number | null; source: TechnicalSource | null };
  seismic: {
    basic_acceleration_g: number | null;
    contribution_coefficient_k: number | null;
    /** Not in Annex 1 of NCSE-02: ab < 0.04g and the code is not mandatory. */
    below_0_04g: boolean;
    source: TechnicalSource;
  };
  snow: { ground_load_kn_m2: number | null; winter_climate_zone: number | null; source: TechnicalSource };
  wind: { zone: string | null; source: TechnicalSource };
  rainfall_hs1: { zone: string | null; source: TechnicalSource };
  drainage_hs5: { zone: string | null; isohyet: number | null; intensity_mm_h: number | null; source: TechnicalSource };
  thermal_zone_hs3: { zone: string | null; source: TechnicalSource };
  /** `listed: false` means HS 6 does not apply there, not missing data. */
  radon: { listed: boolean; zone: "I" | "II" | null; source: TechnicalSource };
  lightning: { ground_flash_density: number | null; source: TechnicalSource };
  solar_irradiation_kwh_m2_day: { monthly: number[] | null; source: TechnicalSource | null };
  mains_water_temperature_c: { monthly: number[] | null; source: TechnicalSource | null };
}

/** `GET /v1/places/{place}`. `location` and `technical_data` only for municipalities. */
export interface PlaceDetail extends Place {
  location: {
    latitude: number | null;
    longitude: number | null;
    altitude_m: number | null;
    area_km2: number | null;
    population: number | null;
  } | null;
  technical_data: PlaceTechnicalData | null;
  regulations: { national: number; regional: number; municipal: number };
  links: { regulations: string; coverage?: string };
}

/** `GET /v1/sandbox`: the parcels a sandbox key answers with, and the case each one covers. */
export interface SandboxInfo {
  object: "sandbox";
  recorded_at: string | null;
  parcels: Array<{
    ref: string;
    place: { geo_id: string; ine: string; name: string | null };
    case: string;
    centroid: { lat: number; lon: number } | null;
  }>;
  docs_url: string;
}
