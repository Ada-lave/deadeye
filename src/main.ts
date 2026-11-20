import './style.css';
import {coach,demo,emptySnapshot,rankItems, type Snapshot, type Item, type Stat} from './model';
import {accountId, parseMatch, applyMatch, unavailableSnapshot} from './watch';
import {getCurrentWebviewWindow} from '@tauri-apps/api/webviewWindow';
import {invoke} from '@tauri-apps/api/core';
const app=document.querySelector<HTMLDivElement>('#app')!;
const key='deadeye-snapshot-v1';
function load(): Snapshot {try {const saved=localStorage.getItem(key); return saved ? {...emptySnapshot,...JSON.parse(saved)} : {...emptySnapshot};} catch{return {...emptySnapshot}}}
let s=load();
const esc=(v:unknown)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const fmt=(n:number)=>Math.round(n).toLocaleString('ru-RU');
const isHud=new URLSearchParams(location.search).has('hud');
function hud(){const c=coach(s);app.innerHTML=`<div class="hud"><div class="hudbar" data-tauri-drag-region><b data-tauri-drag-region>◉ DEADEYE / ${s.demo?'ДЕМО':s.source==='public'?`ПУБЛИЧНЫЙ СНИМОК · ${s.publicAt ? new Date(s.publicAt).toLocaleTimeString('ru-RU') : '?'} · ЗАДЕРЖКА`:s.source==='unavailable'?'НЕТ ПУБЛИЧНЫХ ДАННЫХ · ВВОД НЕ ПРОВЕРЕН':'ВРУЧНУЮ'}</b><button id="hide" title="Скрыть">×</button></div><div data-tauri-drag-region class="hudbody"><small data-tauri-drag-region>ТАКТИЧЕСКИЙ ПРИОРИТЕТ</small><h2 data-tauri-drag-region>${c.title}</h2><p data-tauri-drag-region>${c.reason}</p><strong data-tauri-drag-region>${c.context}</strong></div></div>`;document.querySelector('#hide')?.addEventListener('click',()=>getCurrentWebviewWindow().hide());}
if (isHud) {
  const refreshHud = () => { s = load(); hud(); };
  hud();
  window.addEventListener('storage', e => { if (e.key === key) refreshHud(); });
  // Refresh on restore as a fallback if an OS suspends a hidden webview.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshHud(); });
} else {
app.innerHTML=`<main><header><div><div class="brand">◉ DEADEYE <span> / COMPANION</span></div><h1>Играйте осознаннее.</h1><p>Тактический помощник для стандартного Deadlock</p></div><div class="actions"><button id="clear">Новый ручной снимок</button><button id="demo">Загрузить демо</button><button id="hud" class="primary">Открыть HUD ↗</button></div></header><div class="hud-controls"><label><input id="click-through" type="checkbox" disabled> Пропускать клики через HUD</label><span id="hotkey-status">Проверка HUD…</span><button id="retry-hotkey" hidden>Повторить регистрацию</button></div><div class="notice">● НЕ LIVE <span> · Ручной ввод или публичный снимок с задержкой. Данные не считываются из игры.</span></div><section class="panel watch"><div class="sectionhead"><div><small>ДОПОЛНИТЕЛЬНЫЙ ИСТОЧНИК</small><h2>Публичный матч</h2></div></div><p class="muted">Только стандартные матчи, доступные в игровом Watch (топ-200). API кэширует данные; обновление раз в 130 секунд, это не live. ID отправляется Deadlock API только после подключения; ручные наблюдения остаются на устройстве.</p><div class="watch-actions"><label>Steam3 account ID или SteamID64<input id="account" type="text" inputmode="numeric" autocomplete="off" placeholder="Например, 123456789"></label><button id="connect">Подключить</button><button id="disconnect" disabled>Отключить</button><button id="watch-refresh" disabled>Обновить</button></div><p class="muted" id="watch-status" aria-live="polite">Не подключено. Доступен ручной режим и демо.</p></section><div class="grid"><section class="panel"><div class="sectionhead"><div><small>01 / ВАШ СНИМОК</small><h2>Ситуация в матче</h2></div><span id="mode" class="badge"></span></div><p class="muted">Измените значения по тому, что видите в игре.</p><div class="fields"><label>Герой<select id="hero"><option value="">Неизвестно</option><option value="6">Hero #6</option></select></label><label>Время матча, мин<input id="minutes" type="number" placeholder="Неизвестно" min="0" max="180"></label><label>Души союзников<input id="allied" type="number" placeholder="Неизвестно" min="0"></label><label>Души противников<input id="enemy" type="number" placeholder="Неизвестно" min="0"></label><label>Союзников живы<input id="alliesAlive" type="number" placeholder="Неизвестно" min="0" max="6"></label><label>Врагов живы<input id="enemiesAlive" type="number" placeholder="Неизвестно" min="0" max="6"></label><label>Личные непотраченные души<input id="unspent" type="number" placeholder="Неизвестно" min="0"></label></div><div class="checks"><label>Давление на наш объект<select id="pressure"><option value="">Неизвестно</option><option value="true">Да</option><option value="false">Нет</option></select></label><label>Возможность взять объект<select id="opportunity"><option value="">Неизвестно</option><option value="true">Да</option><option value="false">Нет</option></select></label></div></section><div><section class="panel recommendation"><small>02 / ПРИОРИТЕТ СЕЙЧАС</small><h2 id="rec-title"></h2><p id="rec-reason"></p><div id="rec-context" class="context"></div><div id="cash" class="muted"></div></section><section class="panel stats"><div class="sectionhead"><div><small>03 / ИСТОРИЧЕСКИЕ ДАННЫЕ</small><h2>Контекст героя</h2></div><button id="refresh">Обновить ↻</button></div><p id="status" class="muted">Загрузка Deadlock API…</p><div id="hero-stats"></div><div id="items"></div><p class="footnote">Публичные агрегаты Deadlock API, не текущий матч. Предметы: минимум 100 матчей, сортировка по доле побед с предметом. Корреляция не означает причинность: выборки и стадии игры различаются; это не гарантия эффективности.</p></section></div></div><footer>DEADEYE · РУЧНОЙ РЕЖИМ <span>Никаких инъекций, чтения памяти или автоматизации игры.</span></footer></main>`;
const fields=['hero','minutes','allied','enemy','alliesAlive','enemiesAlive','unspent','pressure','opportunity'] as const;
let heroes: {id:number;name:string}[]=[];let items:Item[]=[];let heroStats:{hero_id:number;wins:number;matches:number;bucket?:number}[]=[];let request=0;
function render() {
  const heroSelect = document.querySelector<HTMLSelectElement>('#hero')!;
  if (s.hero !== null && !Array.from(heroSelect.options).some(option => option.value === String(s.hero))) {
    heroSelect.add(new Option(`Hero #${s.hero}`, String(s.hero)));
  }
  for (const k of fields) {
    const el = document.getElementById(k) as HTMLInputElement;
    el.value = s[k] === null ? '' : String(s[k]);
    if (k === 'hero' || k === 'allied' || k === 'enemy') el.disabled = s.source === 'public';
  }
  const c = coach(s);
  document.querySelector('#mode')!.textContent = s.demo ? 'ДЕМО' : s.source === 'public' ? 'ПУБЛИЧНЫЙ СНИМОК · ЗАДЕРЖКА' : s.source === 'unavailable' ? 'НЕТ ПУБЛИЧНЫХ ДАННЫХ · ВВОД НЕ ПРОВЕРЕН' : 'ВРУЧНУЮ';
  document.querySelector('#rec-title')!.textContent = c.title;
  document.querySelector('#rec-reason')!.textContent = c.reason;
  document.querySelector('#rec-context')!.textContent = c.context;
  document.querySelector('#cash')!.textContent = `Непотрачено: ${s.unspent === null ? 'неизвестно' : fmt(s.unspent) + ' душ'}`;
}
function save() { localStorage.setItem(key, JSON.stringify(s)); render(); }
fields.forEach(k => document.getElementById(k)!.addEventListener('change', e => {
  const el = e.target as HTMLInputElement;
  if (k === 'pressure' || k === 'opportunity') s[k] = el.value === '' ? null : el.value === 'true';
  else {
    const max = k === 'alliesAlive' || k === 'enemiesAlive' ? 6 : k === 'minutes' ? 180 : 1e9;
    s[k] = el.value === '' ? null : Math.max(0, Math.min(max, Number(el.value) || 0));
  }
  if (s.source !== 'public' && s.source !== 'unavailable') s.source = 'manual';
  save();
  if (k === 'hero') void loadHero();
}));

let connected: number | null = null;
let generation = 0;
let requestSerial = 0;
let matchId: string | null = null;
let lastRequest = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const watchStatus = document.querySelector<HTMLElement>('#watch-status')!;
const watchRefresh = document.querySelector<HTMLButtonElement>('#watch-refresh')!;
const disconnectButton = document.querySelector<HTMLButtonElement>('#disconnect')!;
const connectButton = document.querySelector<HTMLButtonElement>('#connect')!;
const accountInput = document.querySelector<HTMLInputElement>('#account')!;
const COOLDOWN = 130_000;

function disconnect(message = 'Не подключено. Введите данные вручную или загрузите демо.') {
  generation++;
  requestSerial++;
  connected = null;
  matchId = null;
  lastRequest = 0;
  if (timer) clearInterval(timer);
  timer = undefined;
  disconnectButton.disabled = true;
  connectButton.disabled = false;
  watchRefresh.disabled = true;
  accountInput.disabled = false;
  watchStatus.textContent = message;
  s = {...emptySnapshot};
  save();
  void loadHero();
}
function updateWatchButton() {
  const remaining = Math.max(0, Math.ceil((lastRequest + COOLDOWN - Date.now()) / 1000));
  watchRefresh.disabled = connected === null || remaining > 0;
  watchRefresh.textContent = remaining > 0 ? `Обновить (${remaining} с)` : 'Обновить';
}
async function refreshWatch() {
  if (connected === null || Date.now() - lastRequest < COOLDOWN) return;
  const account = connected, token = generation, serial = ++requestSerial;
  lastRequest = Date.now();
  updateWatchButton();
  watchStatus.textContent = 'Запрос публичного снимка…';
  try {
    const response = await fetch(`https://api.deadlock-api.com/v1/matches/active?account_id=${account}`, {signal: AbortSignal.timeout(20_000)});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: unknown = await response.json();
    if (token !== generation || serial !== requestSerial) return;
    const match = parseMatch(data, account);
    if (!match) {
      matchId = null;
      s = unavailableSnapshot(s);
      save();
      void loadHero();
      watchStatus.textContent = 'Матч не найден в публичном Watch или данных недостаточно. Публичные значения недоступны. Ручные наблюдения не подтверждены — проверьте их. Автоповтор через 130 секунд.';
      return;
    }
    const oldHero = s.hero;
    s = applyMatch(s, match, match.id === matchId, Date.now());
    matchId = match.id;
    save();
    watchStatus.textContent = `Матч #${match.id}: получено ${new Date(s.publicAt!).toLocaleTimeString('ru-RU')}. Данные кэшируются и могут отставать; живые, объекты и время укажите вручную.`;
    if (oldHero !== s.hero) void loadHero();
  } catch (error) {
    if (token !== generation || serial !== requestSerial) return;
    matchId = null;
    s = unavailableSnapshot(s);
    save();
    void loadHero();
    watchStatus.textContent = `Публичный источник недоступен: ${error}. Публичные значения недоступны. Ручные наблюдения не подтверждены — проверьте их. Автоповтор через 130 секунд.`;
  }
}
connectButton.addEventListener('click', () => {
  if (connected !== null) return;
  let account: number;
  try { account = accountId(accountInput.value); }
  catch (error) { watchStatus.textContent = String(error); return; }
  disconnect();
  connected = account;
  connectButton.disabled = true;
  accountInput.disabled = true;
  disconnectButton.disabled = false;
  timer = setInterval(() => { updateWatchButton(); void refreshWatch(); }, 1000);
  void refreshWatch();
});
disconnectButton.addEventListener('click', () => disconnect());
document.querySelector('#clear')!.addEventListener('click', () => disconnect('Новый ручной снимок. Заполните известные поля.'));
watchRefresh.addEventListener('click', () => void refreshWatch());
document.querySelector('#demo')!.addEventListener('click', () => {
  disconnect('Демо включено; публичный источник отключён.');
  s = {...demo}; save(); void loadHero();
});
// A previous process cannot assert that its public snapshot is still current.
if (s.source === 'public' || s.source === 'unavailable') {
  s = {...emptySnapshot}; save(); void loadHero();
  watchStatus.textContent = 'Сохранённый публичный снимок устарел. Подключитесь снова или введите данные вручную.';
}
const clickThrough = document.querySelector<HTMLInputElement>('#click-through')!;
const hotkeyStatus = document.querySelector<HTMLElement>('#hotkey-status')!;
const retryHotkey = document.querySelector<HTMLButtonElement>('#retry-hotkey')!;

document.querySelector('#hud')!.addEventListener('click', async () => {
  try { await invoke('show_hud'); }
  catch (error) { hotkeyStatus.textContent = `HUD недоступен: ${error}`; }
});
clickThrough.addEventListener('change', async () => {
  try { await invoke('set_click_through', { enabled: clickThrough.checked }); }
  catch (error) {
    clickThrough.checked = !clickThrough.checked;
    hotkeyStatus.textContent = `Не удалось изменить режим HUD: ${error}`;
  }
});
retryHotkey.addEventListener('click', async () => {
  try { hotkeyStatus.textContent = await invoke<string>('retry_shortcut'); }
  catch (error) { hotkeyStatus.textContent = `Ошибка регистрации: ${error}`; }
});
async function initializeHudControls() {
  try {
    const [supported, enabled, status] = await invoke<[boolean, boolean, string]>('hud_status');
    clickThrough.disabled = !supported;
    clickThrough.checked = enabled;
    hotkeyStatus.textContent = status;
    retryHotkey.hidden = !supported;
  } catch {
    hotkeyStatus.textContent = 'HUD и горячая клавиша доступны в приложении Tauri.';
  }
}
void initializeHudControls();
async function json<T>(path:string):Promise<T>{const r=await fetch(`https://api.deadlock-api.com/v1/${path}`);if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json() as Promise<T>}
async function loadHero(){const n=++request;if(s.hero===null){document.querySelector('#hero-stats')!.textContent='';document.querySelector('#items')!.textContent='Выберите героя для исторической статистики.';return;}const h=heroStats.find(x=>x.hero_id===s.hero && (x.bucket===0||x.bucket===undefined));document.querySelector('#hero-stats')!.innerHTML=h?`<div class="hero-stat"><b>${(100*h.wins/h.matches).toFixed(1)}%</b> побед · ${fmt(h.matches)} матчей</div>`:'';document.querySelector('#items')!.textContent='Загрузка предметов…';try{const stats=await json<Stat[]>(`analytics/item-stats?hero_ids=${s.hero}&min_matches=100`);if(n!==request)return;const ranked=rankItems(stats,items);document.querySelector('#items')!.innerHTML=ranked.length?`<h3>Предметы по доле побед</h3>${ranked.map(x=>`<div class="item"><div><b>${esc(x.item.name)}</b><span>${x.item.cost!=null?fmt(x.item.cost)+' душ · ':''}ср. покупка ${Math.round(x.avg_buy_time_s/60)} мин</span></div><div class="rate">${(x.rate*100).toFixed(1)}%<span>${fmt(x.matches)} матчей</span></div></div>`).join('')}`:'Нет подходящих данных по предметам.'}catch(e){if(n===request)document.querySelector('#items')!.textContent=`Не удалось загрузить предметы: ${e}`}}
async function refresh(){document.querySelector('#status')!.textContent='Загрузка Deadlock API…';try{[heroes,items,heroStats]=await Promise.all([json<typeof heroes>('assets/heroes?only_active=true'),json<Item[]>('assets/items'),json<typeof heroStats>('analytics/hero-stats')]);const select=document.querySelector<HTMLSelectElement>('#hero')!;select.innerHTML='<option value="">Неизвестно</option>'+heroes.map(h=>`<option value="${h.id}">${esc(h.name)}</option>`).join('');if(s.hero!==null && !heroes.some(h=>h.id===s.hero))select.insertAdjacentHTML('beforeend',`<option value="${s.hero}">Hero #${s.hero}</option>`);render();document.querySelector('#status')!.textContent='Источник: api.deadlock-api.com · загружено';void loadHero()}catch(e){document.querySelector('#status')!.textContent=`Deadlock API недоступен: ${e}. Ручной режим работает офлайн.`}}
document.querySelector('#refresh')!.addEventListener('click',()=>void refresh());render();void refresh();}
