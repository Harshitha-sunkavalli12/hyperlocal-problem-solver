export type Status =
  | "REPORTED"
  | "VERIFIED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED";

export interface Reasoning {
  agent: string;
  summary: string;
  details: Record<string, any>;
  source: string;
  created_at: string;
}

export interface StatusEvent {
  status: Status;
  note: string;
  created_at: string;
}

export interface Reporter {
  id: string;
  handle: string;
  xp: number;
  badges: string[];
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  issue_type: string;
  severity: number;
  status: Status;
  lat: number;
  lng: number;
  zone: string;
  address: string;
  image_url: string;
  proof_image_url: string;
  department: string;
  sla_deadline: string | null;
  priority_score: number;
  eta_hours: number | null;
  upvotes: number;
  downvotes: number;
  confidence: number;
  needs_review: boolean;
  cluster_id: string | null;
  created_at: string;
  updated_at: string;
  reporter?: Reporter | null;
  events?: StatusEvent[];
  reasonings?: Reasoning[];
}

export interface Analysis {
  issue_type: string;
  severity: number;
  confidence: number;
  suggested_department: string;
  reasoning: string;
  source: string;
}

export interface LeaderboardEntry {
  handle: string;
  xp: number;
  badges: string[];
  locality: string;
  rank: number;
  is_hero: boolean;
}

export interface Prediction {
  zone: string;
  issue_type: string;
  probability: number;
  horizon_days: number;
  reasoning: string;
  low_confidence: boolean;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  issue_id: string | null;
  read: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_reported: number;
  total_resolved: number;
  avg_resolution_hours: number;
  active_issues: number;
  sla_compliance: Record<string, number>;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  by_zone: Record<string, number>;
  engagement: Record<string, number>;
  impact_potholes_fixed: number;
  impact_money_saved_cr: number;
}
