import {
  COMPARISON_SESSION_STORAGE_KEY,
  COMPARISON_TOTAL_ROUNDS
} from "./constants";
import type {
  QUERY_TEXT,
  ComparisonRoundChoice,
  ComparisonRoundIndex,
  ComparisonSessionState
} from "./types";

const isValidRoundIndex = (value: unknown): value is ComparisonRoundIndex => {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= COMPARISON_TOTAL_ROUNDS;
};

const isValidRoundChoice = (value: unknown): value is ComparisonRoundChoice => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const choice = value as Partial<ComparisonRoundChoice>;

  return (
    isValidRoundIndex(choice.roundIndex) &&
    typeof choice.leftTrackId === "string" &&
    choice.leftTrackId.length > 0 &&
    typeof choice.rightTrackId === "string" &&
    choice.rightTrackId.length > 0 &&
    typeof choice.chosenTrackId === "string" &&
    choice.chosenTrackId.length > 0 &&
    (choice.selectedAt === undefined || typeof choice.selectedAt === "string")
  );
};

const isValidSessionState = (value: unknown): value is ComparisonSessionState => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<ComparisonSessionState>;

  return (
    session.totalRounds === COMPARISON_TOTAL_ROUNDS &&
    Array.isArray(session.choices) &&
    session.choices.every((choice) => isValidRoundChoice(choice)) &&
    (session.queryText === undefined || typeof session.queryText === "string" || session.queryText === null)
  );
};

const createEmptySession = (): ComparisonSessionState => ({
  totalRounds: COMPARISON_TOTAL_ROUNDS,
  choices: [],
  queryText: null
});

const normalizeSessionState = (session: ComparisonSessionState): ComparisonSessionState => ({
  ...session,
  queryText: typeof session.queryText === "string" ? session.queryText : null
});

export const loadComparisonSession = (): ComparisonSessionState | null => {
  const rawValue = window.localStorage.getItem(COMPARISON_SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!isValidSessionState(parsed)) {
      return null;
    }

    return normalizeSessionState(parsed);
  } catch {
    return null;
  }
};

export const saveComparisonSession = (
  session: ComparisonSessionState
): ComparisonSessionState => {
  window.localStorage.setItem(
    COMPARISON_SESSION_STORAGE_KEY,
    JSON.stringify(session)
  );

  return session;
};

export const startNewComparisonSession = (
  queryText: QUERY_TEXT | null = null
): ComparisonSessionState => {
  const newSession: ComparisonSessionState = {
    ...createEmptySession(),
    queryText
  };

  return saveComparisonSession(newSession);
};

export const resetComparisonSession = (): void => {
  window.localStorage.removeItem(COMPARISON_SESSION_STORAGE_KEY);
};

export const saveRoundChoice = (
  choice: ComparisonRoundChoice
): ComparisonSessionState => {
  const session = loadComparisonSession() ?? createEmptySession();
  const filteredChoices = session.choices.filter(
    (storedChoice) => storedChoice.roundIndex !== choice.roundIndex
  );

  const nextSession: ComparisonSessionState = {
    ...session,
    choices: [...filteredChoices, choice].sort(
      (left, right) => left.roundIndex - right.roundIndex
    )
  };

  return saveComparisonSession(nextSession);
};

export const saveQueryText = (queryText: QUERY_TEXT): ComparisonSessionState => {
  const session = loadComparisonSession() ?? createEmptySession();

  return saveComparisonSession({
    ...session,
    queryText
  });
};