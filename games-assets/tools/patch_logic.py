# -*- coding: utf-8 -*-
"""为各游戏注入独立逻辑（覆盖 fork 后的 js 关键段落）"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PK10_TAIL = '''
  const POS_NAMES = ['冠军', '亚军', '季军', '第四名', '第五名', '第六名', '第七名', '第八名', '第九名', '第十名'];
  const PLAY_ITEMS = [
    '大', '小', '单', '双', '龙', '虎', '冠亚大', '冠亚小', '冠亚单', '冠亚双',
    '冠军大', '冠军小', '亚军大', '亚军小', '季军大', '季军小',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
  ];
'''

LHC_LOGIC = r'''
  const PLAY_ITEMS = ['特码大','特码小','特码单','特码双','特大','特小','红波','蓝波','绿波','特码','正码'];
  function randomDraw() {
    const pool = [];
    for (let i = 1; i <= 49; i++) pool.push(i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const mains = pool.slice(0, 6).sort((a,b)=>a-b);
    const special = pool[6];
    return mains.concat([special]);
  }
  function ballHtml(n, cls) {
    const c = cls ? ' ' + cls : '';
    const num = String(n).padStart(2, '0');
    return `<img class="PFX-ball-img${c}" src="./assets/balls/ball_${num}.png" alt="${n}" loading="lazy">`;
  }
  function waveColor(n) {
    const r = [1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46];
    const b = [3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48];
    if (r.includes(n)) return '红';
    if (b.includes(n)) return '蓝';
    return '绿';
  }
  function gyMeta(nums) {
    const s = nums.reduce((a,b)=>a+b,0);
    const sp = nums[6];
    return { text: `${s} ${s>=175?'大':'小'} ${s%2?'单':'双'}`, sum: s, wave: waveColor(sp) };
  }
  function lhRow(nums) { return gyMeta(nums).wave; }
  function renderDrawBar(row) {
    if (!row) return;
    $('#barIssue').text(row.issue);
    $('#barBalls').html(row.nums.map(n => ballHtml(n, 'xs')).join(''));
    $('#barGy').text('特码 ' + row.nums[6] + ' ' + row.gy.split(' ').pop());
  }
  function renderDrawTable() {
    $('#drawTableBody').html(historyRows.slice(0, HISTORY_SHOW).map(r => `
      <tr>
        <td class="cell-issue" title="${r.issue}">${r.issue}</td>
        ${r.nums.slice(0,6).map(n => `<td>${ballHtml(n,'tbl')}</td>`).join('')}
        <td>${ballHtml(r.nums[6],'tbl')}</td>
        <td class="cell-gy">${r.gy.replace(/\s+/g,'')}</td>
        <td class="cell-lh">${r.lh}</td>
      </tr>`).join(''));
  }
  function resultCardHtml(nums, issue) {
    const meta = gyMeta(nums);
    return `<div class="PFX-result-card"><div class="PFX-result-card__head"><span class="PFX-result-card__title">GNAME</span>
      <div class="PFX-result-card__order">${nums.map(n=>ballHtml(n,'sm')).join('')}</div></div>
      <div class="PFX-result-card__foot" style="grid-template-columns:1fr 1fr 1fr">
        <div class="PFX-result-stat"><span class="k">期号</span><span class="v">No.${String(issue).slice(-6)}</span></div>
        <div class="PFX-result-stat"><span class="k">总和</span><span class="v">${meta.text}</span></div>
        <div class="PFX-result-stat"><span class="k">特码色波</span><span class="v">${meta.wave}</span></div>
      </div></div>`;
  }
  function settleBet(play, amount, nums) {
    const sp = nums[6], sum = nums.slice(0,6).reduce((a,b)=>a+b,0);
    let win = Math.random() > 0.5;
    if (/特码大/.test(play)) win = sp >= 25;
    else if (/特码小/.test(play)) win = sp <= 24;
    else if (/特码单/.test(play)) win = sp % 2 === 1;
    else if (/特码双/.test(play)) win = sp % 2 === 0;
    else if (/红波/.test(play)) win = waveColor(sp) === '红';
    else if (/蓝波/.test(play)) win = waveColor(sp) === '蓝';
    else if (/绿波/.test(play)) win = waveColor(sp) === '绿';
    else if (/特大/.test(play)) win = sp >= 25;
    else if (/特小/.test(play)) win = sp <= 24;
    if (!win) return { winAmount: 0, profit: -amount, hit: '' };
    const winAmount = Math.round(amount * 1.98);
    return { winAmount, profit: winAmount - amount, hit: play };
  }
'''

DIGIT_LOGIC = r'''
  const PLAY_ITEMS = ['大','小','单','双','万大','万小','千大','个单','五星大','0','1','2','3','4','5','6','7','8','9'];
  function randomDraw() {
    return Array.from({length:5}, () => Math.floor(Math.random()*10));
  }
  function ballHtml(n, cls) {
    const c = cls ? ' ' + cls : '';
    return `<span class="PFX-ball-img PFX-ball-digit${c}">${n}</span>`;
  }
  function gyMeta(nums) {
    const s = nums.reduce((a,b)=>a+b,0);
    return { text: `${s} ${s>22?'大':'小'} ${s%2?'单':'双'}`, sum: s };
  }
  function lhRow(nums) {
    const big = nums.filter(n=>n>=5).length;
    return big >= 3 ? '偏大' : '偏小';
  }
  function renderDrawBar(row) {
    if (!row) return;
    $('#barIssue').text(row.issue);
    $('#barBalls').html(row.nums.map(n => ballHtml(n, 'xs')).join(''));
    $('#barGy').text('五星和 ' + row.gy);
  }
  function renderDrawTable() {
    $('#drawTableBody').html(historyRows.slice(0, HISTORY_SHOW).map(r => `
      <tr><td class="cell-issue">${r.issue}</td>
      ${r.nums.map(n=>`<td>${ballHtml(n,'tbl')}</td>`).join('')}
      <td class="cell-gy">${r.gy.replace(/\s+/g,'')}</td><td class="cell-lh">${r.lh}</td></tr>`).join(''));
  }
  function resultCardHtml(nums, issue) {
    const meta = gyMeta(nums);
    return `<div class="PFX-result-card"><div class="PFX-result-card__head"><span class="PFX-result-card__title">GNAME</span>
      <div class="PFX-result-card__order">${nums.map(n=>ballHtml(n,'sm')).join('')}</div></div>
      <div class="PFX-result-card__foot"><div class="PFX-result-stat"><span class="k">期号</span><span class="v">No.${String(issue).slice(-6)}</span></div>
      <div class="PFX-result-stat"><span class="k">和值</span><span class="v">${meta.text}</span></div>
      <div class="PFX-result-stat"><span class="k">形态</span><span class="v">${lhRow(nums)}</span></div></div></div>`;
  }
  function settleBet(play, amount, nums) {
    const s = nums.reduce((a,b)=>a+b,0);
    let win = Math.random() > 0.5;
    if (play === '大' || /大/.test(play) && !/小/.test(play)) win = s > 22 || nums[0] >= 5;
    else if (play === '小' || /小/.test(play)) win = s <= 22 || nums[4] <= 4;
    else if (/单/.test(play)) win = s % 2 === 1;
    else if (/双/.test(play)) win = s % 2 === 0;
    if (!win) return { winAmount: 0, profit: -amount, hit: '' };
    const winAmount = Math.round(amount * 1.98);
    return { winAmount, profit: winAmount - amount, hit: play };
  }
'''

DICE_LOGIC = r'''
  const PLAY_ITEMS = ['大','小','单','双','豹子','顺子','三军','1','2','3','4','5','6'];
  function randomDraw() {
    return [1,2,3].map(() => 1 + Math.floor(Math.random()*6));
  }
  function ballHtml(n, cls) {
    const c = cls ? ' ' + cls : '';
    return `<span class="PFX-ball-img PFX-ball-dice${c}">⚅${n}</span>`.replace('⚅','');
  }
  function gyMeta(nums) {
    const s = nums.reduce((a,b)=>a+b,0);
    return { text: `${s} ${s>=11?'大':'小'} ${s%2?'单':'双'}`, sum: s };
  }
  function lhRow(nums) {
    if (nums[0]===nums[1] && nums[1]===nums[2]) return '豹子';
    const sorted = nums.slice().sort((a,b)=>a-b);
    if (sorted[2]-sorted[0]===2 && sorted[1]-sorted[0]===1) return '顺子';
    return '杂六';
  }
  function renderDrawBar(row) {
    if (!row) return;
    $('#barIssue').text(row.issue);
    $('#barBalls').html(row.nums.map(n => `<span class="PFX-dice xs">${n}</span>`).join(''));
    $('#barGy').text('和值 ' + row.gy);
  }
  function renderDrawTable() {
    $('#drawTableBody').html(historyRows.slice(0, HISTORY_SHOW).map(r => `
      <tr><td class="cell-issue">${r.issue}</td>
      ${r.nums.map(n=>`<td><span class="PFX-dice tbl">${n}</span></td>`).join('')}
      <td class="cell-gy">${r.gy.replace(/\s+/g,'')}</td><td class="cell-lh">${r.lh}</td></tr>`).join(''));
  }
  function resultCardHtml(nums, issue) {
    const meta = gyMeta(nums);
    return `<div class="PFX-result-card"><div class="PFX-result-card__head"><span class="PFX-result-card__title">GNAME</span>
      <div class="PFX-result-card__order">${nums.map(n=>`<span class="PFX-dice sm">${n}</span>`).join('')}</div></div>
      <div class="PFX-result-card__foot"><div class="PFX-result-stat"><span class="k">期号</span><span class="v">No.${String(issue).slice(-6)}</span></div>
      <div class="PFX-result-stat"><span class="k">和值</span><span class="v">${meta.text}</span></div>
      <div class="PFX-result-stat"><span class="k">形态</span><span class="v">${lhRow(nums)}</span></div></div></div>`;
  }
  function settleBet(play, amount, nums) {
    const s = nums.reduce((a,b)=>a+b,0);
    let win = Math.random() > 0.5;
    if (play==='大') win = s >= 11;
    else if (play==='小') win = s <= 10;
    else if (play==='单') win = s % 2 === 1;
    else if (play==='双') win = s % 2 === 0;
    else if (play==='豹子') win = nums[0]===nums[1] && nums[1]===nums[2];
    if (!win) return { winAmount: 0, profit: -amount, hit: '' };
    const winAmount = Math.round(amount * 1.98);
    return { winAmount, profit: winAmount - amount, hit: play };
  }
'''

CARD_BASE = r'''
  const SUITS = ['♠','♥','♣','♦'];
  const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  function randCard() {
    const s = SUITS[Math.floor(Math.random()*4)];
    const r = RANKS[Math.floor(Math.random()*13)];
    const v = RANKS.indexOf(r) + 2;
    return { text: s + r, val: v, red: s === '♥' || s === '♦' };
  }
  function cardSpan(c, cls) {
    return `<span class="PFX-card ${c.red?'is-red':''} ${cls||''}">${c.text}</span>`;
  }
'''

CARD3_LOGIC = CARD_BASE + r'''
  const PLAY_ITEMS = ['大','小','单','双','豹子','顺子','金花','对子','散牌','红','黑'];
  function randomDraw() { return [randCard(), randCard(), randCard()]; }
  function ballHtml() { return ''; }
  function evalZjh(cards) {
    const vals = cards.map(c=>c.val).sort((a,b)=>b-a);
    if (vals[0]===vals[1] && vals[1]===vals[2]) return { type:'豹子', max: vals[0] };
    const sorted = vals.slice().sort((a,b)=>a-b);
    if (sorted[2]-sorted[0]===2 && sorted[1]-sorted[0]===1) return { type:'顺子', max: vals[0] };
    if (vals[0]===vals[1] || vals[1]===vals[2]) return { type:'对子', max: vals[0] };
    const sameSuit = cards[0].text[0]===cards[1].text[0] && cards[1].text[0]===cards[2].text[0];
    if (sameSuit) return { type:'金花', max: vals[0] };
    return { type:'散牌', max: vals[0] };
  }
  function gyMeta(nums) { const e=evalZjh(nums); return { text: e.type + ' ' + e.max }; }
  function lhRow(nums) { return evalZjh(nums).type; }
  function renderDrawBar(row) {
    if (!row) return;
    $('#barIssue').text(row.issue);
    $('#barBalls').html(row.nums.map(c=>cardSpan(c,'xs')).join(''));
    $('#barGy').text('牌型 ' + row.gy);
  }
  function renderDrawTable() {
    $('#drawTableBody').html(historyRows.slice(0,HISTORY_SHOW).map(r=>`
      <tr><td class="cell-issue">${r.issue}</td>
      ${r.nums.map(c=>`<td>${cardSpan(c,'tbl')}</td>`).join('')}
      <td class="cell-gy">${r.lh}</td><td class="cell-lh">${r.nums[0].val}</td></tr>`).join(''));
  }
  function resultCardHtml(nums, issue) {
    const e = evalZjh(nums);
    return `<div class="PFX-result-card"><div class="PFX-result-card__head"><span class="PFX-result-card__title">GNAME</span>
      <div class="PFX-result-card__order">${nums.map(c=>cardSpan(c,'sm')).join('')}</div></div>
      <div class="PFX-result-card__foot"><div class="PFX-result-stat"><span class="k">期号</span><span class="v">No.${String(issue).slice(-6)}</span></div>
      <div class="PFX-result-stat"><span class="k">牌型</span><span class="v">${e.type}</span></div>
      <div class="PFX-result-stat"><span class="k">最大牌</span><span class="v">${e.max}</span></div></div></div>`;
  }
  function settleBet(play, amount, nums) {
    const e = evalZjh(nums);
    let win = Math.random() > 0.5;
    if (play==='大') win = e.max >= 8;
    else if (play==='小') win = e.max <= 7;
    else if (play===e.type) win = true;
    if (!win) return { winAmount:0, profit:-amount, hit:'' };
    return { winAmount: Math.round(amount*1.98), profit: Math.round(amount*0.98), hit: play };
  }
'''

CARD5_LOGIC = CARD_BASE + r'''
  const PLAY_ITEMS = ['牛大','牛小','牛单','牛双','无牛','牛牛','牛九','牛八','牛七'];
  function randomDraw() { return Array.from({length:5}, randCard); }
  function ballHtml() { return ''; }
  function evalNiu(cards) {
    const vals = cards.map(c=>c.val);
    for (let i=0;i<3;i++) for (let j=i+1;j<4;j++) for (let k=j+1;k<5;k++) {
      const s = vals[i]+vals[j]+vals[k];
      if (s%10===0) {
        const rest = vals.filter((_,idx)=>idx!==i&&idx!==j&&idx!==k);
        const n = (rest[0]+rest[1])%10;
        return { niu: n===0?10:n, text: n===0?'牛牛':'牛'+n };
      }
    }
    return { niu:0, text:'无牛' };
  }
  function gyMeta(nums) { const e=evalNiu(nums); return { text: e.text }; }
  function lhRow(nums) { const e=evalNiu(nums); return e.niu>=6?'牛大':'牛小'; }
  function renderDrawBar(row) {
    if (!row) return;
    $('#barIssue').text(row.issue);
    $('#barBalls').html(row.nums.map(c=>cardSpan(c,'xs')).join(''));
    $('#barGy').text('牌型 ' + row.gy);
  }
  function renderDrawTable() {
    $('#drawTableBody').html(historyRows.slice(0,HISTORY_SHOW).map(r=>`
      <tr><td class="cell-issue">${r.issue}</td>
      ${r.nums.map(c=>`<td>${cardSpan(c,'tbl')}</td>`).join('')}
      <td class="cell-gy">${r.lh}</td><td class="cell-lh">${evalNiu(r.nums).text}</td></tr>`).join(''));
  }
  function resultCardHtml(nums, issue) {
    const e = evalNiu(nums);
    return `<div class="PFX-result-card"><div class="PFX-result-card__head"><span class="PFX-result-card__title">GNAME</span>
      <div class="PFX-result-card__order">${nums.map(c=>cardSpan(c,'sm')).join('')}</div></div>
      <div class="PFX-result-card__foot"><div class="PFX-result-stat"><span class="k">期号</span><span class="v">No.${String(issue).slice(-6)}</span></div>
      <div class="PFX-result-stat"><span class="k">牛数</span><span class="v">${e.text}</span></div>
      <div class="PFX-result-stat"><span class="k">大小</span><span class="v">${lhRow(nums)}</span></div></div></div>`;
  }
  function settleBet(play, amount, nums) {
    const e = evalNiu(nums);
    let win = play.includes(e.text) || (play==='牛大'&&e.niu>=6) || (play==='牛小'&&e.niu>0&&e.niu<=5) || (play==='无牛'&&e.niu===0);
    if (!win && Math.random()>0.45) win = true;
    if (!win) return { winAmount:0, profit:-amount, hit:'' };
    return { winAmount: Math.round(amount*1.98), profit: Math.round(amount*0.98), hit: play };
  }
'''

BAC_LOGIC = CARD_BASE + r'''
  const PLAY_ITEMS = ['庄','闲','和','庄对','闲对','庄大','闲大','总和大','总和小'];
  function baccaratVal(c) { return Math.min(10, c.val >= 10 ? 0 : c.val); }
  function randomDraw() {
    const p = [randCard(), randCard()], b = [randCard(), randCard()];
    let pv = (baccaratVal(p[0])+baccaratVal(p[1]))%10;
    let bv = (baccaratVal(b[0])+baccaratVal(b[1]))%10;
    return { player: p, banker: b, pv, bv, result: pv>bv?'庄赢':pv<bv?'闲赢':'和' };
  }
  function gyMeta(draw) { return { text: `庄${draw.bv} 闲${draw.pv} ${draw.result}` }; }
  function lhRow(draw) { return draw.result; }
  function renderDrawBar(row) {
    if (!row) return;
    $('#barIssue').text(row.issue);
    $('#barBalls').html(`<span class="PFX-bjl">庄${row.meta.bv} 闲${row.meta.pv}</span>`);
    $('#barGy').text(row.gy);
  }
  function renderDrawTable() {
    $('#drawTableBody').html(historyRows.slice(0,HISTORY_SHOW).map(r=>`
      <tr><td class="cell-issue">${r.issue}</td>
      <td>${r.meta.bv}</td><td>${r.meta.pv}</td><td>${r.meta.result}</td>
      <td>—</td><td>—</td></tr>`).join(''));
  }
  function resultCardHtml(draw, issue) {
    const m = draw.meta || draw;
    return `<div class="PFX-result-card"><div class="PFX-result-card__head"><span class="PFX-result-card__title">GNAME</span>
      <div class="PFX-result-card__order"><span class="PFX-bjl">庄${m.bv} : 闲${m.pv}</span></div></div>
      <div class="PFX-result-card__foot"><div class="PFX-result-stat"><span class="k">期号</span><span class="v">No.${String(issue).slice(-6)}</span></div>
      <div class="PFX-result-stat"><span class="k">结果</span><span class="v">${m.result}</span></div>
      <div class="PFX-result-stat"><span class="k">庄闲</span><span class="v">${m.bv} / ${m.pv}</span></div></div></div>`;
  }
  function settleBet(play, amount, draw) {
    const m = draw.meta || draw;
    let win = (play==='庄'&&m.result==='庄赢')||(play==='闲'&&m.result==='闲赢')||(play==='和'&&m.result==='和');
    if (!win && Math.random()>0.5) win = true;
    if (!win) return { winAmount:0, profit:-amount, hit:'' };
    return { winAmount: Math.round(amount*1.98), profit: Math.round(amount*0.98), hit: play };
  }
'''

COMMON_HELPERS = r'''
  function getRoundRemain() {
    const elapsed = (Date.now() - todayStartMs()) / 1000;
    return INTERVAL - (elapsed % INTERVAL);
  }
  function getCurrentIssue() {
    const elapsed = (Date.now() - todayStartMs()) / 1000;
    return fmtIssue8(Math.floor(elapsed / INTERVAL) + 1);
  }
  function isBettingOpen() {
    const r = getRoundRemain();
    return r > FREEZE_SEC && r <= INTERVAL - DRAW_SEC;
  }
  function parseBet(text) {
    const t = String(text || '').trim();
    const m = t.match(/(\d+)\s*$/);
    if (!m) return null;
    const amount = parseInt(m[1], 10);
    const play = t.slice(0, m.index).trim();
    if (!amount || !play) return null;
    return { play, amount };
  }
  function recordBet(name, text) {
    if (!isBettingOpen()) return false;
    const bet = parseBet(text);
    if (!bet) return false;
    const issue = getCurrentIssue();
    if (!issueBetBook[issue]) issueBetBook[issue] = {};
    if (!issueBetBook[issue][name]) issueBetBook[issue][name] = [];
    issueBetBook[issue][name].push(bet);
    return true;
  }
  function fmtProfit(n) {
    return (n >= 0 ? '+' : '') + n;
  }
  function buildBetListVerifyText(issue) {
    const book = issueBetBook[issue];
    if (!book || !Object.keys(book).length) {
      return `${issue}期已封盘\n竞猜列表核对\n——————————\n暂无下注数据`;
    }
    const blocks = Object.keys(book).map(name => {
      const bets = book[name];
      const total = bets.reduce((s, b) => s + b.amount, 0);
      const lines = bets.map(b => `${b.play} ${b.amount}`).join('\n');
      return `（${name}）下注总金额：${total}\n${lines}`;
    });
    return `${issue}期已封盘\n竞猜列表核对\n——————————\n${blocks.join('\n\n')}`;
  }
'''

COMMON_RUNTIME = r'''
  function getStats(uid) {
    const key = 'PFX_stats_' + uid;
    let s = null;
    try { s = JSON.parse(localStorage.getItem(key)); } catch (e) { /* */ }
    return s || { turnover: 0, winloss: 0, rebate: 0 };
  }
  function saveStats(uid, s) {
    localStorage.setItem('PFX_stats_' + uid, JSON.stringify(s));
  }
  function refreshStats() {
    const bal = App.getBalance(user.uid);
    const s = getStats(user.uid);
    $('#statBalance').text(bal.toLocaleString('en-US'));
    $('#statTurnover').text(Math.round(s.turnover).toLocaleString('en-US'));
    const $wl = $('#statWinloss').text((s.winloss >= 0 ? '+' : '') + Math.round(s.winloss).toLocaleString('en-US'));
    $wl.toggleClass('is-plus', s.winloss > 0).toggleClass('is-minus', s.winloss < 0);
    $('#statRebate').text(Math.round(s.rebate).toLocaleString('en-US'));
  }
  function hasLastDraw() {
    if (!lastDraw) return false;
    return Array.isArray(lastDraw) ? lastDraw.length > 0 : lastDraw.bv !== undefined;
  }
  function buildHistory(count) {
    const rows = [];
    const base = Math.max(1, Math.floor((Date.now() - todayStartMs()) / 1000 / INTERVAL));
    for (let i = 0; i < count; i++) {
      const nums = i === 0 && hasLastDraw() ? lastDraw : randomDraw();
      const meta = gyMeta(nums);
      const row = {
        issue: fmtIssue8(base - i),
        nums,
        gy: meta.text,
        lh: lhRow(nums)
      };
      if (nums && nums.bv !== undefined) row.meta = nums;
      rows.push(row);
    }
    return rows;
  }
  function scrollChat() {
    const el = document.getElementById('chatFeed');
    if (el) el.scrollTop = el.scrollHeight;
  }
  function appendMsg(opts) {
    const time = opts.time || fmtTime(new Date());
    const isSelf = opts.self;
    const isRobot = opts.robot;
    const avatar = `<div class="PFX-msg__avatar"><img src="${fixAvatar(opts.avatar)}" alt=""></div>`;
    const meta = `<div class="PFX-msg__meta">
            <span class="PFX-msg__name">${opts.name}</span>
            <span class="PFX-msg__time">${time}</span>
          </div>`;
    const bubble = `<div class="PFX-msg__bubble">${opts.html}</div>`;
    const html = isSelf
      ? `<div class="PFX-msg is-self">
        <div class="PFX-msg__top">${meta}${avatar}</div>
        ${bubble}
      </div>`
      : `<div class="PFX-msg${isRobot ? ' is-robot' : ''}">
        ${avatar}
        <div class="PFX-msg__body">
          ${meta}
          ${bubble}
        </div>
      </div>`;
    $('#chatFeed').append(html);
    scrollChat();
  }
'''

GAMES = [
    ('lhc', 'lhc', '六合彩', LHC_LOGIC),
    ('ffc', 'ffc', '分分彩', DIGIT_LOGIC),
    ('ssc', 'ssc', '时时彩', DIGIT_LOGIC),
    ('kuai3', 'k3', '1分快三', DICE_LOGIC),
    ('zhajinhua', 'zjh', '炸金花', CARD3_LOGIC),
    ('douniu', 'dn', '斗牛', CARD5_LOGIC),
    ('baccarat', 'bjl', '百家乐', BAC_LOGIC),
]


def inject_logic(dir_name, pfx, gname, logic_src):
    js_path = ROOT / dir_name / 'js' / f'{pfx}.js'
    css_path = ROOT / dir_name / 'css' / f'{pfx}.css'
    text = js_path.read_text(encoding='utf-8')
    helpers = COMMON_HELPERS
    runtime = COMMON_RUNTIME.replace('PFX', pfx)
    logic = logic_src.replace('PFX', pfx).replace('GNAME', gname)
    if 'const HISTORY_SHOW' not in logic:
        logic = logic.rstrip() + '\n  const HISTORY_SHOW = 10;\n'

    text = re.sub(
        r'  const POS_NAMES = \[[^\]]*\];\n  const PLAY_ITEMS = \[[\s\S]*?\];\n\n',
        '',
        text, count=1
    )

    book_marker = '  const issueBetBook = {};'
    settle_marker = '  function settleIssue(issue, nums) {'
    si = text.find(book_marker)
    ei = text.find(settle_marker)
    if si < 0 or ei <= si:
        print('SKIP', dir_name, '- markers missing')
        return
    insert_at = si + len(book_marker)
    text = text[:insert_at] + '\n' + helpers + logic + '\n' + text[ei:]

    text = re.sub(
        r'  function randomDraw\(\) \{\n    const arr = \[1, 2, 3, 4, 5, 6, 7, 8, 9, 10\];[\s\S]*?  function pushRobotClose',
        runtime + '\n  function pushRobotClose',
        text, count=1
    )

    if dir_name == 'baccarat':
        text = text.replace(
            'historyRows[0].nums = lastDraw.slice();',
            'historyRows[0].nums = lastDraw;\n  historyRows[0].meta = lastDraw;'
        )
        text = text.replace(
            'const row = {\n        issue: issueCur,\n        nums: newDraw,',
            'const row = {\n        issue: issueCur,\n        nums: newDraw,\n        meta: newDraw,'
        )
        text = text.replace(
            'gy: gyMeta(newDraw).text,\n        lh: lhRow(newDraw)',
            'gy: gyMeta(newDraw).text,\n        lh: lhRow(newDraw),\n        meta: newDraw'
        )

    text = text.replace(
        "const plays = ['大', '小', '单', '双', '龙', '虎', '冠亚大', '冠军大', '亚军单'];\n"
        "    const pos = POS_NAMES[Math.floor(Math.random() * POS_NAMES.length)];\n"
        "    const amt = [10, 20, 50, 100, 200][Math.floor(Math.random() * 5)];\n"
        "    const betText = `${pos}${plays[Math.floor(Math.random() * plays.length)]} ${amt}`;",
        "const betText = `${PLAY_ITEMS[Math.floor(Math.random() * PLAY_ITEMS.length)]} ${[10, 20, 50, 100, 200][Math.floor(Math.random() * 5)]}`;"
    )
    text = text.replace(
        "App.toast('格式：玩法 + 金额，如 冠军大 100');",
        "App.toast('格式：玩法 + 金额，如 ' + PLAY_ITEMS[0] + ' 100');"
    )
    text = text.replace(
        "const left = ['大', '小', '单', '双'];\n    const right = ['删除', '龙', '虎', '冠亚和'];",
        "const left = ['大', '小', '单', '双'];\n    const right = ['删除', '0', '00', '500'];"
    )
    text = re.sub(
        rf"const cls = rk === '删除' \? ' {re.escape(pfx)}-key--del' : \(rk === '冠亚和' \? ' {re.escape(pfx)}-key--gy' : ' {re.escape(pfx)}-key--side'\);",
        f"const cls = rk === '删除' ? ' {pfx}-key--del' : ' {pfx}-key--side';",
        text, count=1
    )

    text = text.replace("const betText = `${POS_NAMES[i % 10]}${['大', '小', '单', '双'][i % 4]} ${[20, 50, 100][i % 3]}`;",
                        "const betText = `${PLAY_ITEMS[i % PLAY_ITEMS.length]} ${[20, 50, 100][i % 3]}`;")
    text = text.replace("const myBet = '冠军大 100';", "const myBet = PLAY_ITEMS[0] + ' 100';")

    js_path.write_text(text, encoding='utf-8')

    css = css_path.read_text(encoding='utf-8')
    extra = f'''
.PFX-ball-digit {{ display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:4px;background:linear-gradient(145deg,#f0c848,#a87818);color:#1a1408;font-weight:700;font-size:12px; }}
.PFX-ball-digit.xs {{ width:20px;height:20px;font-size:11px; }}
.PFX-ball-digit.sm {{ width:24px;height:24px; }}
.PFX-ball-digit.tbl {{ width:clamp(16px,3.6vw,20px);height:clamp(16px,3.6vw,20px);font-size:10px; }}
.PFX-dice {{ display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:4px;background:#2a3a5a;color:#fff;font-weight:700;font-size:12px;border:1px solid rgba(255,255,255,.2); }}
.PFX-dice.xs,.PFX-dice.tbl,.PFX-dice.sm {{ font-size:11px; }}
.PFX-card {{ display:inline-block;padding:2px 4px;border-radius:4px;background:#fff;color:#111;font-size:11px;font-weight:700;border:1px solid #ccc;margin:0 1px; }}
.PFX-card.is-red {{ color:#c22; }}
.PFX-card.xs {{ font-size:10px; }}
.PFX-card.sm {{ font-size:13px; }}
.PFX-card.tbl {{ font-size:9px; }}
.PFX-bjl {{ font-size:13px;color:var(--gold-bright);letter-spacing:1px; }}
'''.replace('PFX', pfx)
    if f'.{pfx}-ball-digit' not in css:
        css += extra
        css_path.write_text(css, encoding='utf-8')
    print('patched', dir_name)


if __name__ == '__main__':
    for d, p, n, l in GAMES:
        inject_logic(d, p, n, l)
