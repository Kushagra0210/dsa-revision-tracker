export type ProblemCreateData = {
  problemNumber: string;
  title: string;
  platform?: string;
  difficulty?: string | null;
  topic?: string | null;
  url?: string | null;
  solutionUrl?: string | null;
  notes?: string | null;
};

export type RevisionView = {
  id: string;
  revisionNumber: number;
  intervalDays: number;
  scheduledDate: Date;
  status: string;
  completedAt: Date | null;
  result: string | null;
  notes: string | null;
  timeSpentSec: number | null;
  solutionViewed: boolean;
};

export type ProblemView = {
  id: string;
  problemNumber: string;
  title: string;
  platform: string;
  url: string | null;
  difficulty: string | null;
  topic: string | null;
  notes: string | null;
  solutionUrl: string | null;
  tags: string[];
  registeredAt: Date;
  revisions: RevisionView[];
};

export type EffectiveStatus = "completed" | "overdue" | "due_today" | "upcoming";

export type RevisionQueueItem = {
  revisionId: string;
  problemId: string;
  problemNumber: string;
  title: string;
  platform: string;
  difficulty: string | null;
  topic: string | null;
  url: string | null;
  solutionUrl: string | null;
  notes: string | null;
  revisionNumber: number;
  totalRevisions: number;
  intervalDays: number;
  scheduledDate: Date;
  status: EffectiveStatus;
};

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };
