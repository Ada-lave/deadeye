import {emptySnapshot, type Snapshot} from './model';

const STEAM_OFFSET = 76561197960265728n;
const MAX_ACCOUNT = 4294967295n;
export function accountId(input: string): number {
  const text = input.trim();
  if (!/^\d+$/.test(text)) throw new Error('Введите числовой Steam3 account ID или SteamID64');
  let value = BigInt(text);
  if (value > MAX_ACCOUNT) value -= STEAM_OFFSET;
  if (value < 1n || value > MAX_ACCOUNT) throw new Error('ID вне допустимого диапазона');
  return Number(value);
}

type Row = Record<string, unknown>;
function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
export interface PublicMatch { id: string; hero: number; allied: number | null; enemy: number | null; }
export function parseMatch(data: unknown, account: number): PublicMatch | null {
  if (!Array.isArray(data)) throw new Error('Неожиданный ответ API');
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue;
    const match = raw as Row;
    if (match.game_mode_parsed !== 'KECitadelGameModeNormal' || !Array.isArray(match.players)) continue;
    const player = (match.players as Row[]).find(p => p && number(p.account_id) === account);
    if (!player) continue;
    const team = player.team === 0 || player.team === 1 ? player.team : player.team_parsed === 'Team0' ? 0 : player.team_parsed === 'Team1' ? 1 : null;
    const hero = number(player.hero_id);
    const id = match.match_id;
    if (team === null || hero === null || !Number.isInteger(hero) || hero === 0 || (typeof id !== 'number' && typeof id !== 'string') || !/^\d+$/.test(String(id)) || String(id) === '0') continue;
    return {id: String(id), hero, allied: number(match[`net_worth_team_${team}`]), enemy: number(match[`net_worth_team_${1-team}`])};
  }
  return null;
}
export function applyMatch(previous: Snapshot, match: PublicMatch, sameMatch: boolean, now: number): Snapshot {
  const base = sameMatch ? previous : emptySnapshot;
  return {...base, demo:false, source:'public', publicAt:now, hero:match.hero, allied:match.allied, enemy:match.enemy};
}

// Public fields are no longer trustworthy after a failed refresh. Observations
// entered by the user remain available, but must be identified as unverified.
export function unavailableSnapshot(previous: Snapshot): Snapshot {
  if (previous.source === 'unavailable') return previous;
  return {
    ...previous,
    hero: null,
    allied: null,
    enemy: null,
    publicAt: undefined,
    demo: false,
    source: 'unavailable',
  };
}
