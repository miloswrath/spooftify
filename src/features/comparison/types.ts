import { COMPARISON_TOTAL_ROUNDS } from "./constants";

export type ComparisonRoundIndex =
  | 1
  | 2
  | 3
  | 4
  | typeof COMPARISON_TOTAL_ROUNDS;

export type TrackId = string;
export type QUERY_TEXT = string;

export interface ComparisonRoundChoice {
  roundIndex: ComparisonRoundIndex;
  leftTrackId: TrackId;
  rightTrackId: TrackId;
  chosenTrackId: TrackId;
  selectedAt?: string;
}

export interface ComparisonSessionState {
  totalRounds: typeof COMPARISON_TOTAL_ROUNDS;
  choices: ComparisonRoundChoice[];
  queryText: QUERY_TEXT | null;
  judgement?: string;
  judgementGeneratedAt?: number;
}