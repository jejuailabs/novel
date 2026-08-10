export type Genre = "webnovel" | "webtoon" | "drama" | "multi";
export type Phase = 1 | 2;
export type SessionType = "brainstorm" | "direction" | "review" | "decision";
export type MessageRole = "user" | "assistant";
export type NodeStatus = "확정" | "진화중" | "보류" | "폐기";
export type EpisodeStatus =
  | "draft"
  | "streaming"
  | "reviewed"
  | "approved"
  | "locked";
export type BibleType = "concept" | "production" | "log";
export type MetricEventType =
  | "session_message"
  | "episode_gen"
  | "episode_revision"
  | "consistency_check"
  | "tracker_update"
  | "bible_promotion"
  | "bible_upload"
  | "completion_judge"
  | "volume_calc";
export type IssueSeverity = "high" | "medium" | "low";
export type IssueType =
  | "bible_mismatch"
  | "tracker_mismatch"
  | "required_phrase_mismatch"
  | "sensory_anchor_missing";
export type Plan = "free" | "pro" | "studio";

export interface NvProject {
  id: string;
  user_id: string;
  title: string;
  genre: Genre;
  target_length: number | null;
  phase: Phase;
  created_at: string;
  updated_at: string;
}

export interface NvSession {
  id: string;
  project_id: string;
  session_type: SessionType;
  created_at: string;
}

export interface NvMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  attachments: unknown | null;
  token_count: number | null;
  created_at: string;
}

export interface NvNode {
  id: string;
  project_id: string;
  node_number: string;
  title: string;
  content: string | null;
  tags: string[];
  status: NodeStatus;
  session_id: string | null;
  origin_message_id: string | null;
  parent_node_ids: string[];
  child_node_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface NvBible {
  id: string;
  project_id: string;
  concept_bible: Record<string, unknown>;
  production_bible: Record<string, unknown>;
  creation_log: Record<string, unknown>;
  version_concept: string;
  version_production: string;
  version_log: string;
  created_at: string;
  updated_at: string;
}

export interface NvCanonTracker {
  id: string;
  project_id: string;
  version: string;
  state: Record<string, unknown>;
  last_updated: string;
}

export interface NvEpisode {
  id: string;
  project_id: string;
  bu: number;
  hwa: number;
  content: string | null;
  word_count: number | null;
  status: EpisodeStatus;
  created_at: string;
  approved_at: string | null;
}

export interface NvEpisodeRevision {
  id: string;
  episode_id: string;
  revision_number: number;
  content: string;
  reason: string | null;
  created_at: string;
}

export interface ConsistencyIssue {
  type: IssueType;
  severity: IssueSeverity;
  location?: { start_char: number; end_char: number };
  expected: string;
  actual: string;
  source_ref: string;
  suggested_fix?: string;
}

export interface NvConsistencyCheck {
  id: string;
  episode_id: string;
  check_run_at: string;
  issues: ConsistencyIssue[];
  passed: boolean;
}

export interface NvMetric {
  id: string;
  project_id: string;
  event_type: MetricEventType;
  entity_id: string | null;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_krw: number;
  duration_ms: number | null;
  created_at: string;
}

export interface NvSubscription {
  id: string;
  user_id: string;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string | null;
  current_period_end: string | null;
  monthly_token_limit: number;
  monthly_token_used: number;
  reset_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NodeCandidate {
  title: string;
  content: string;
  tag_candidates: string[];
  source_role: MessageRole;
}

export interface BibleUpdate {
  bible_type: BibleType;
  section_path: string;
  operation: "append" | "update" | "replace";
  content: string;
  reason: string;
}

export interface TrackerDiff {
  field: string;
  before?: unknown;
  after?: unknown;
  operation?: "add" | "remove" | "update";
  value?: unknown;
  reason: string;
}

export interface PhaseCompletionResult {
  ready: boolean;
  score: number;
  checks: {
    name: string;
    passed: boolean;
    actual?: number;
    required?: number;
    missing?: string[];
    missing_sections?: string[];
  }[];
  gaps: string[];
  recommendations: string[];
}

export interface VolumeEstimate {
  webnovel_episodes: number;
  webtoon_episodes: number;
  drama_episodes: number;
  movies: number;
  confidence: number;
  notes: string;
}
