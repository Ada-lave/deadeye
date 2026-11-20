import { describe, expect, it } from 'vitest';
import { accountId, parseMatch, applyMatch, unavailableSnapshot } from './watch';
import { coach, demo } from './model';
const row = {match_id: 123, game_mode_parsed:'KECitadelGameModeNormal', players:[{account_id:42, hero_id:6, team:1}], net_worth_team_0:10000, net_worth_team_1:15000};
describe('public watch', () => {
 it('validates Steam IDs with bigint', () => { expect(accountId('42')).toBe(42); expect(accountId('76561197960265770')).toBe(42); for(const id of ['0','4294967296','76561197960265728','76561202255233024','x']) expect(()=>accountId(id)).toThrow(); });
 it('maps team and rejects unrelated, nonstandard or incomplete matches', () => {expect(parseMatch([row],42)).toEqual({id:'123',hero:6,allied:15000,enemy:10000}); expect(parseMatch([row],43)).toBeNull();expect(parseMatch([{...row,match_id:null}],42)).toBeNull();expect(parseMatch([{...row,game_mode_parsed:'other'}],42)).toBeNull();});
 it('preserves unknowns and never carries demo into another match', () => {const s=applyMatch(demo,parseMatch([row],42)!,false,1);expect(s.pressure).toBeNull();expect(s.minutes).toBeNull();expect(coach(s).title).toBe('Уточните обстановку');expect(applyMatch({...s,pressure:true},parseMatch([row],42)!,true,2).pressure).toBe(true)});
 it('does not advise fighting without allies',()=>expect(coach({...demo,alliesAlive:0}).title).toBe('Дождитесь союзников'));
});

describe('fallback', () => {
 it('clears public fields but keeps manual observations through repeated failures', () => {
  const first = unavailableSnapshot({...demo, source:'public', minutes:22, pressure:true});
  expect(first).toMatchObject({hero:null, allied:null, enemy:null, minutes:22, pressure:true, demo:false, source:'unavailable'});
  const edited = {...first, hero:1, allied:1234, pressure:false};
  expect(unavailableSnapshot(edited)).toEqual(edited);
  const next = applyMatch(edited, parseMatch([row],42)!, false, 3);
  expect(next.pressure).toBeNull();
  expect(next.minutes).toBeNull();
 });
 it('treats missing economy as unknown rather than zero', () => {
  const match = parseMatch([{...row, net_worth_team_0:null, net_worth_team_1:undefined}],42)!;
  expect(match).toMatchObject({allied:null,enemy:null});
  expect(applyMatch(demo,match,false,1)).toMatchObject({allied:null,enemy:null});
 });
});
