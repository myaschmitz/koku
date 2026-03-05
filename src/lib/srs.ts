import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card as FSRSCard,
  type Grade,
  type RecordLogItem,
} from "ts-fsrs";
import type { Card, UserSettings } from "./types";

const params = generatorParameters();
const scheduler = fsrs(params);

export { Rating };

export function cardToFSRS(card: Card): FSRSCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  } as FSRSCard;
}

export function scheduleCard(
  card: Card,
  rating: Grade,
  settings: UserSettings
): RecordLogItem {
  const now = new Date();
  const fsrsCard = cardToFSRS(card);
  const result = scheduler.next(fsrsCard, now, rating);

  if (rating === Rating.Again) {
    result.card.due = new Date(
      now.getTime() + settings.again_interval_hours * 60 * 60 * 1000
    );
  } else if (rating === Rating.Hard) {
    result.card.due = new Date(
      now.getTime() + settings.hard_interval_hours * 60 * 60 * 1000
    );
  }

  return result;
}

export function getSchedulingPreview(
  card: Card,
  settings: UserSettings
): Record<Grade, string> {
  const now = new Date();
  const fsrsCard = cardToFSRS(card);
  const scheduling = scheduler.repeat(fsrsCard, now);

  const formatInterval = (ms: number): string => {
    const hours = Math.round(ms / (60 * 60 * 1000));
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d`;
    const months = Math.round(days / 30);
    return `${months}mo`;
  };

  return {
    [Rating.Again]: formatInterval(
      settings.again_interval_hours * 60 * 60 * 1000
    ),
    [Rating.Hard]: formatInterval(
      settings.hard_interval_hours * 60 * 60 * 1000
    ),
    [Rating.Good]: formatInterval(
      scheduling[Rating.Good].card.due.getTime() - now.getTime()
    ),
    [Rating.Easy]: formatInterval(
      scheduling[Rating.Easy].card.due.getTime() - now.getTime()
    ),
  } as Record<Grade, string>;
}

export function createNewCard() {
  return createEmptyCard();
}
