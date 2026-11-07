/**
 * API contract — mirrors README.md exactly. Do not change shapes here without
 * agreeing with the backend owner.
 */

// ---- /scan ---------------------------------------------------------------
export type ApiDateSource = 'printed' | 'estimated';

export interface ScanItem {
  name: string;
  emoji: string;
  characterName: string;
  personality: string;
  daysLeft: number;
  dateSource: ApiDateSource;
  intro: string;
  /** Optional: where the item sits in the photo, [ymin, xmin, ymax, xmax] normalized 0–1000. */
  box?: [number, number, number, number];
}
export interface ScanRequest {
  /** base64 jpeg, no data: prefix */
  image: string;
}
export interface ScanResponse {
  items: ScanItem[];
}

// ---- /chat ---------------------------------------------------------------
export interface ChatItem {
  id: string;
  name: string;
  characterName: string;
  personality: string;
  daysLeft: number;
}
export interface ChatRequest {
  items: ChatItem[];
  userMessage?: string;
}
export interface ChatLine {
  id: string;
  text: string;
}
export interface ChatResponse {
  lines: ChatLine[];
}

// ---- /match --------------------------------------------------------------
export interface MatchRequest {
  items: ChatItem[];
}
export interface MatchResponse {
  title: string;
  minutes: number;
  /** ids of the items this recipe rescues */
  rescues: string[];
  steps: string[];
  thankYou: string;
}

// ---- /ghost --------------------------------------------------------------
export interface GhostRequest {
  item: ChatItem;
}
export interface GhostResponse {
  epitaph: string;
}

// ---- /messages -----------------------------------------------------------
export interface MessagesRequest {
  items: ChatItem[];
}
export interface MessagesResponse {
  messages: ChatLine[];
}

// ---- Local app model (not sent to the backend as-is) ---------------------
/** 'adjusted' is set locally when the user uses +/− day. User correction always wins. */
export type DateSource = ApiDateSource | 'adjusted';
export type ItemStatus = 'inFridge' | 'rescued' | 'lost';

export interface FoodItem {
  /** Local id assigned by the app when scanned. */
  id: string;
  name: string;
  emoji: string;
  characterName: string;
  personality: string;
  intro: string;
  dateSource: DateSource;
  /** ISO calendar date (YYYY-MM-DD) the item was added. */
  addedAt: string;
  /** ISO calendar date (YYYY-MM-DD) the item should be used by. Days left is derived from this. */
  expiresAt: string;
  status: ItemStatus;
  /** Set when the item becomes a ghost (from /ghost). */
  epitaph?: string;
  /** ISO date when it was eaten/tossed. */
  resolvedAt?: string;
  /** Thumbnail cropped from the scanned photo: a file in the app's documents. Never uploaded. */
  photo?: string;
}

export function toChatItem(item: FoodItem, daysLeft: number): ChatItem {
  return {
    id: item.id,
    name: item.name,
    characterName: item.characterName,
    personality: item.personality,
    daysLeft,
  };
}
