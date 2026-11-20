export interface Snapshot {
  hero: number | null; minutes: number | null; allied: number | null; enemy: number | null;
  alliesAlive: number | null; enemiesAlive: number | null; pressure: boolean | null;
  opportunity: boolean | null; unspent: number | null; demo: boolean;
  source?: 'manual' | 'public' | 'unavailable';
  publicAt?: number;
}
export const emptySnapshot: Snapshot = {hero:null, minutes:null, allied:null, enemy:null, alliesAlive:null, enemiesAlive:null, pressure:null, opportunity:null, unspent:null, demo:false, source:'manual'};
export const demo: Snapshot = {hero: 6, minutes: 18, allied: 48000, enemy: 52000, alliesAlive: 4, enemiesAlive: 3, pressure: true, opportunity: true, unspent: 1800, demo: true};
export function coach(s: Snapshot) {
 const delta = s.allied !== null && s.enemy !== null ? s.allied - s.enemy : null;
 const context = `Души: ${delta === null ? 'неизвестно' : (delta >= 0 ? '+' : '') + delta.toLocaleString('ru-RU')} · живы ${s.alliesAlive ?? '?'}/${s.enemiesAlive ?? '?'} · ${s.minutes === null ? '? мин' : s.minutes + ' мин'}`;
 if (s.alliesAlive === 0) return {title:'Дождитесь союзников', reason:'Союзников в живых нет. Дождитесь возрождения и избегайте рискованных действий.', context};
 if (s.pressure === true) return {title:'Защитите объект', reason:'Сначала остановите видимое давление на свои объекты. Соберитесь рядом и не вступайте в бой поодиночке.', context};
 if (s.opportunity === true && s.alliesAlive !== null && s.enemiesAlive !== null && s.alliesAlive >= s.enemiesAlive) return {title:'Разыграйте объект', reason:'Видна возможность, а по живым вы не уступаете. Продвигайтесь вместе и контролируйте отход.', context};
 if (s.pressure === null || s.opportunity === null || s.alliesAlive === null || s.enemiesAlive === null) return {title:'Уточните обстановку', reason:'Тактические данные неизвестны. Проверьте живых и объекты; не принимайте решение о бою только по душам.', context};
 if (delta === null) return {title:'Уточните экономику', reason:'Души команд неизвестны. Проверьте карту и экономику перед решением.', context};
 if (delta < -3000) return {title:'Сократите отставание', reason:'Избегайте равного боя без преимущества: безопасно собирайте души и защищайте линии.', context};
 if (delta > 3000) return {title:'Используйте преимущество', reason:'Держитесь вместе, занимайте пространство и ищите безопасное давление на линии.', context};
 return {title:'Фармите и держите линии', reason:'Явного приоритета по объектам нет. Собирайте души, следите за картой и группируйтесь перед боем.', context};
}
export interface Stat { item_id:number; wins:number; matches:number; avg_buy_time_s:number; bucket?:number }
export interface Item { id:number; name:string; type:string; cost?:number; shopable?:boolean }
export function rankItems(stats: Stat[], items: Item[], min = 100) {
 const byId = new Map(items.filter(x=>x.type==='upgrade' && x.shopable !== false).map(x=>[x.id,x]));
 return stats.filter(s=>s.matches>=min && s.wins>=0 && s.wins<=s.matches && byId.has(s.item_id) && (s.bucket === undefined || s.bucket === 0)).map(s=>({...s,item:byId.get(s.item_id)!,rate:s.wins/s.matches})).sort((a,b)=>b.rate-a.rate || b.matches-a.matches || a.item_id-b.item_id).slice(0,5);
}
