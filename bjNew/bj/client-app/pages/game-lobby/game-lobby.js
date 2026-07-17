/**
 * 游戏大厅（初版骨架）
 *
 * 当前实现：
 *   - 顶部用户信息（头像 / 昵称 / ID）取自 App.getUser()
 *   - 所在房间名称 / 房间号：从 URL ?roomNo= 参数取，再用 App.getRooms() 查名字
 *   - 积分余额：原型阶段写死 88,888；后期接 App.getBalance() / 后端接口
 *   - 游戏卡片点击：toast 提示"即将上线"（后期 iframe 加载 games-assets/<id>/index.html）
 *   - 底部 Tab：除"大厅"外都 toast 提示"开发中"
 *   - 充值按钮：toast 占位
 *   - 右上角退出：清当前登录态后回 welcome
 *
 * 后续要补：
 *   - 真实游戏卡片图（替换 emoji 占位）
 *   - 战绩 / 积分明细 / 个人中心子页
 *   - 充值流程
 *   - 接 server 端 GET /api/games?roomNo=xxx 拉真实游戏列表
 */
$(function () {

  // ===== 顶部用户信息 =====
  const user = App.getUser();
  $('#userAvatar').attr('src', user.avatar);
  $('#userName').text(user.name);
  $('#userId').text(user.uid);

  // ===== 所在房间（从 URL 参数取 roomNo） =====
  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();
  const room = App.getRooms().find(r => r.roomNo === roomNo);
  // 房间名末尾的"厅"字不展示（如：黄金一号厅 → 黄金一号）
  const displayRoomName = room ? room.name.replace(/厅$/, '') : '未知房间';
  $('#roomName').text(displayRoomName);
  $('#roomNo').text(roomNo || '');

  // ===== 积分（原型阶段：localStorage 模拟，下分会扣减、上分审核后由客服增加） =====
  $('#balance').text(App.getBalance(user.uid).toLocaleString('en-US'));

  // 点击积分区跳"个人战绩"页（统计 / 趋势 / 胜率）
  $('#balanceBtn').on('click', function () {
    App.go('../stats/stats.html' + (roomNo ? ('?roomNo=' + encodeURIComponent(roomNo)) : ''));
  });

  // ===== 游戏列表数据 + SVG 图标（黑金线描风） =====
  // 字段约定：
  //   type        - 'lottery' 定时开奖（显示期号 + 倒计时）；'instant' 即时开局（实时进行）
  //   intervalSec - 一期长度（仅 lottery 用），单位秒；分分彩 60、时时彩 600、北京赛车 300...
  //   freezeSec   - 封盘提示秒数（默认 5）：倒计时 ≤ freezeSec 时右下角显示「封盘中」
  //   drawSec     - 开奖动画秒数（默认 2）：每期开始头 drawSec 秒显示「开奖中」+ 红色脉冲
  const GAMES = [
    {
      key: 'mahjong', name: '麻将胡了', desc: '即 进 即 转 · 随 时 开 玩', tag: '热 门',
      type: 'instant',
      iconImg: '../../assets/images/games/mahjong.png',
      svg: `<rect x="11" y="7" width="26" height="34" rx="3"
                  fill="rgba(244,211,107,0.18)"
                  stroke="currentColor" stroke-width="1.6"/>
            <rect x="11" y="7" width="26" height="3.5"
                  fill="rgba(244,211,107,0.35)" stroke="none"/>
            <path d="M19 16 V30 M29 16 V30 M24 11 V36
                     M16 22 H32"
                  stroke="currentColor" stroke-width="1.7" fill="none"/>`
    },
    {
      key: 'queen', name: '赏金女王', desc: '即 进 即 转 · 随 时 开 玩', tag: '热 门',
      type: 'instant',
      iconImg: '../../assets/images/games/queen.png',
      svg: `<path d="M8 19 L13 32 L24 14 L35 32 L40 19 L37 38 L11 38 Z"
                  fill="rgba(244,211,107,0.22)"
                  stroke="currentColor" stroke-width="1.6"/>
            <circle cx="13" cy="19" r="1.8" fill="currentColor"/>
            <circle cx="24" cy="14" r="2.1" fill="currentColor"/>
            <circle cx="35" cy="19" r="1.8" fill="currentColor"/>
            <path d="M11 38 H37" stroke="currentColor" stroke-width="2"/>`
    },
    {
      key: 'ssc', name: '时时彩', desc: '5 位数字 · 10 分一期',
      type: 'lottery', intervalSec: 600,
      iconImg: '../../assets/images/games/ssc.png',
      svg: `<circle cx="24" cy="25" r="14"
                    fill="rgba(244,211,107,0.18)"
                    stroke="currentColor" stroke-width="1.6"/>
            <path d="M19 8 H29 M24 8 V12"
                  stroke="currentColor" stroke-width="1.6"/>
            <line x1="24" y1="25" x2="24" y2="14"
                  stroke="currentColor" stroke-width="2"/>
            <line x1="24" y1="25" x2="33" y2="28"
                  stroke="currentColor" stroke-width="1.6"/>
            <circle cx="24" cy="25" r="1.8" fill="currentColor"/>`
    },
    {
      key: 'ffc', name: '分分彩', desc: '5 位数字 · 1 分一期',
      type: 'lottery', intervalSec: 60,
      iconImg: '../../assets/images/games/ffc.png',
      svg: `<circle cx="24" cy="24" r="16"
                    fill="rgba(244,211,107,0.18)"
                    stroke="currentColor" stroke-width="1.6"/>
            <circle cx="24" cy="24" r="2" fill="currentColor"/>
            <line x1="24" y1="24" x2="24" y2="12"
                  stroke="currentColor" stroke-width="1.7"/>
            <line x1="24" y1="24" x2="34" y2="24"
                  stroke="currentColor" stroke-width="2.2"/>
            <line x1="24" y1="10" x2="24" y2="12"
                  stroke="currentColor" stroke-width="1.8"/>
            <line x1="38" y1="24" x2="40" y2="24"
                  stroke="currentColor" stroke-width="1.8"/>
            <line x1="24" y1="38" x2="24" y2="40"
                  stroke="currentColor" stroke-width="1.8"/>
            <line x1="10" y1="24" x2="8" y2="24"
                  stroke="currentColor" stroke-width="1.8"/>`
    },
    {
      key: 'speed-racing', name: '极速赛车', desc: '1 - 10 号 · 1 分一期',
      type: 'lottery', intervalSec: 60,
      iconImg: '../../assets/images/games/speed-racing.png',
      svg: `<path d="M6 30 L9 22 L18 18 L34 18 L42 28 L42 32 L6 32 Z"
                  fill="rgba(244,211,107,0.22)"
                  stroke="currentColor" stroke-width="1.6"/>
            <path d="M14 22 L18 18 L30 18 L34 22"
                  stroke="currentColor" stroke-width="1.3" fill="none"/>
            <circle cx="14" cy="34" r="3.6"
                    fill="rgba(0,0,0,0.55)"
                    stroke="currentColor" stroke-width="1.6"/>
            <circle cx="34" cy="34" r="3.6"
                    fill="rgba(0,0,0,0.55)"
                    stroke="currentColor" stroke-width="1.6"/>
            <path d="M2 14 H8 M2 20 H6 M2 26 H5"
                  stroke="currentColor" stroke-width="1.4" opacity="0.6"/>`
    },
    {
      key: 'bjsc', name: '北京赛车', desc: '10 选号 · 5 分一期',
      type: 'lottery', intervalSec: 300,
      iconImg: '../../assets/images/games/bjsc.png',
      svg: `<line x1="7" y1="6" x2="7" y2="38"
                  stroke="currentColor" stroke-width="2"/>
            <rect x="7" y="6" width="13" height="11"
                  fill="rgba(244,211,107,0.20)"
                  stroke="currentColor" stroke-width="1.3"/>
            <rect x="7" y="6" width="6.5" height="5.5"
                  fill="currentColor" opacity="0.6"/>
            <rect x="13.5" y="11.5" width="6.5" height="5.5"
                  fill="currentColor" opacity="0.6"/>
            <path d="M20 32 L22 26 L28 24 L36 24 L40 30 L40 34 L20 34 Z"
                  fill="rgba(244,211,107,0.22)"
                  stroke="currentColor" stroke-width="1.5"/>
            <circle cx="26" cy="36" r="2.6"
                    fill="rgba(0,0,0,0.55)"
                    stroke="currentColor" stroke-width="1.3"/>
            <circle cx="36" cy="36" r="2.6"
                    fill="rgba(0,0,0,0.55)"
                    stroke="currentColor" stroke-width="1.3"/>`
    },
    {
      key: 'speed-boat', name: '极速飞艇', desc: '快 艇 竞 速 · 1 分一期',
      type: 'lottery', intervalSec: 60,
      iconImg: '../../assets/images/games/speed-boat.png',
      svg: `<path d="M22 8 V20 M22 12 L34 16 L22 18"
                  fill="rgba(244,211,107,0.25)"
                  stroke="currentColor" stroke-width="1.6"/>
            <path d="M4 26 L8 20 L40 20 L44 26 L40 34 L8 34 Z"
                  fill="rgba(244,211,107,0.22)"
                  stroke="currentColor" stroke-width="1.6"/>
            <path d="M4 39 q4 -3 8 0 t8 0 t8 0 t8 0 t8 0"
                  stroke="currentColor" stroke-width="1.4" fill="none" opacity="0.75"/>
            <path d="M2 42 q4 -2 8 0 t8 0 t8 0 t8 0 t8 0"
                  stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.5"/>`
    },
    {
      key: 'lhc', name: '幸运六合彩', desc: '49 选 7 · 1 分一期',
      type: 'lottery', intervalSec: 60,
      iconImg: '../../assets/images/games/hk-mark6.png',
      svg: `<circle cx="12" cy="14" r="5"
                    fill="rgba(244,211,107,0.18)"
                    stroke="currentColor" stroke-width="1.5"/>
            <circle cx="24" cy="11" r="5.5"
                    fill="rgba(244,211,107,0.35)"
                    stroke="currentColor" stroke-width="1.7"/>
            <circle cx="36" cy="14" r="5"
                    fill="rgba(244,211,107,0.18)"
                    stroke="currentColor" stroke-width="1.5"/>
            <circle cx="12" cy="32" r="5"
                    fill="rgba(244,211,107,0.18)"
                    stroke="currentColor" stroke-width="1.5"/>
            <circle cx="24" cy="35" r="5"
                    fill="rgba(244,211,107,0.25)"
                    stroke="currentColor" stroke-width="1.5"/>
            <circle cx="36" cy="32" r="5"
                    fill="rgba(244,211,107,0.18)"
                    stroke="currentColor" stroke-width="1.5"/>`
    },
    {
      key: 'kuai3', name: '极速快三', desc: '3 颗 骰 子 · 1 分一期',
      type: 'lottery', intervalSec: 60,
      iconImg: '../../assets/images/games/kuai3.png',
      svg: `<rect x="3" y="14" width="14" height="14" rx="2"
                  fill="rgba(244,211,107,0.20)"
                  stroke="currentColor" stroke-width="1.5"/>
            <circle cx="10" cy="21" r="1.4" fill="currentColor"/>
            <rect x="17" y="20" width="14" height="14" rx="2"
                  fill="rgba(244,211,107,0.30)"
                  stroke="currentColor" stroke-width="1.5"/>
            <circle cx="21" cy="24" r="1.2" fill="currentColor"/>
            <circle cx="27" cy="30" r="1.2" fill="currentColor"/>
            <rect x="31" y="14" width="14" height="14" rx="2"
                  fill="rgba(244,211,107,0.20)"
                  stroke="currentColor" stroke-width="1.5"/>
            <circle cx="35" cy="18" r="1.2" fill="currentColor"/>
            <circle cx="41" cy="18" r="1.2" fill="currentColor"/>
            <circle cx="38" cy="21" r="1.2" fill="currentColor"/>
            <circle cx="35" cy="24" r="1.2" fill="currentColor"/>
            <circle cx="41" cy="24" r="1.2" fill="currentColor"/>`
    },
    {
      key: 'zhajinhua', name: '炸金花', desc: '平台派牌 · 1 分一期', tag: '热 门',
      type: 'lottery', intervalSec: 60,
      iconImg: '../../assets/images/games/zhajinhua.png',
      svg: `<g transform="rotate(-14 16 26)">
              <rect x="7" y="13" width="18" height="26" rx="2"
                    fill="rgba(244,211,107,0.18)"
                    stroke="currentColor" stroke-width="1.4"/>
            </g>
            <g transform="rotate(14 32 26)">
              <rect x="23" y="13" width="18" height="26" rx="2"
                    fill="rgba(244,211,107,0.18)"
                    stroke="currentColor" stroke-width="1.4"/>
            </g>
            <rect x="15" y="10" width="18" height="28" rx="2"
                  fill="rgba(244,211,107,0.35)"
                  stroke="currentColor" stroke-width="1.6"/>
            <path d="M24 17 c-2.5 2 -4 4 -4 6.5 a3 3 0 0 0 6 0
                     a3 3 0 0 0 6 0 c0 -2.5 -1.5 -4.5 -4 -6.5
                     c -2 -1.5 -4 -1.5 -4 0 Z"
                  fill="currentColor" opacity="0.85"/>
            <rect x="22" y="28" width="4" height="6" fill="currentColor" opacity="0.6"/>`
    },
    {
      key: 'douniu', name: '斗牛', desc: '庄闲比牌 · 真人发牌 · 63秒一期',
      type: 'lottery', intervalSec: 63,
      iconImg: '../../assets/images/games/douniu.png',
      svg: `<path d="M11 14 q-4 -6 -1 -10 q5 -1 6 4 q1 4 -1 7"
                  fill="rgba(244,211,107,0.20)"
                  stroke="currentColor" stroke-width="1.5"/>
            <path d="M37 14 q4 -6 1 -10 q-5 -1 -6 4 q-1 4 1 7"
                  fill="rgba(244,211,107,0.20)"
                  stroke="currentColor" stroke-width="1.5"/>
            <ellipse cx="24" cy="27" rx="14" ry="13"
                     fill="rgba(244,211,107,0.22)"
                     stroke="currentColor" stroke-width="1.6"/>
            <circle cx="19" cy="25" r="1.7" fill="currentColor"/>
            <circle cx="29" cy="25" r="1.7" fill="currentColor"/>
            <ellipse cx="24" cy="33" rx="5" ry="3"
                     fill="none" stroke="currentColor" stroke-width="1.4"/>
            <circle cx="22" cy="33" r="0.9" fill="currentColor"/>
            <circle cx="26" cy="33" r="0.9" fill="currentColor"/>`
    },
    {
      key: 'baccarat', name: '百家乐', desc: '平台派牌 · 1 分一期', tag: '热 门',
      type: 'lottery', intervalSec: 60,
      iconImg: '../../assets/images/games/baccarat.png',
      svg: `<rect x="6" y="10" width="18" height="26" rx="2"
                  fill="rgba(244,211,107,0.28)"
                  stroke="currentColor" stroke-width="1.6"/>
            <path d="M15 16 c-2.5 2 -4 5 -4 7.5
                     a3 3 0 0 0 6 0
                     c0 -2.5 -1.5 -5.5 -2 -7.5 Z"
                  fill="currentColor" opacity="0.85"/>
            <rect x="14" y="26" width="2" height="5" fill="currentColor" opacity="0.7"/>
            <rect x="24" y="13" width="18" height="26" rx="2"
                  fill="rgba(244,211,107,0.16)"
                  stroke="currentColor" stroke-width="1.6"/>
            <path d="M33 19 c-2 -2.5 -5 -2.5 -5 0 c0 3 5 6 5 8
                     c0 -2 5 -5 5 -8 c0 -2.5 -3 -2.5 -5 0 Z"
                  fill="currentColor" opacity="0.85"/>`
    },
    {
      key: 'slots', name: '老虎机', desc: '跑 灯 水 果 机 · 押 中 即 赢',
      type: 'instant',
      iconImg: '../../assets/images/games/slots.png',
      svg: `<rect x="4" y="11" width="32" height="28" rx="3"
                  fill="rgba(244,211,107,0.12)"
                  stroke="currentColor" stroke-width="1.6"/>
            <rect x="7" y="15" width="8" height="20" rx="1.2"
                  fill="rgba(244,211,107,0.28)"
                  stroke="currentColor" stroke-width="1.3"/>
            <rect x="16" y="15" width="8" height="20" rx="1.2"
                  fill="rgba(244,211,107,0.38)"
                  stroke="currentColor" stroke-width="1.3"/>
            <rect x="25" y="15" width="8" height="20" rx="1.2"
                  fill="rgba(244,211,107,0.28)"
                  stroke="currentColor" stroke-width="1.3"/>
            <line x1="7" y1="25" x2="33" y2="25"
                  stroke="currentColor" stroke-width="1.3" opacity="0.55"/>
            <line x1="40" y1="15" x2="40" y2="28"
                  stroke="currentColor" stroke-width="2.2"/>
            <circle cx="40" cy="12" r="2.8"
                    fill="rgba(244,211,107,0.40)"
                    stroke="currentColor" stroke-width="1.4"/>
            <rect x="3" y="40" width="34" height="3" rx="1"
                  fill="rgba(244,211,107,0.22)"
                  stroke="currentColor" stroke-width="1.2"/>`
    },
    {
      key: 'bcbm', name: '奔驰宝马', desc: '豪 车 跑 灯 · 押 中 即 赢', tag: '新 品',
      type: 'instant',
      svg: `<rect x="6" y="22" width="36" height="14" rx="4"
                  fill="rgba(244,211,107,0.18)"
                  stroke="currentColor" stroke-width="1.6"/>
            <rect x="12" y="14" width="16" height="10" rx="3"
                  fill="rgba(244,211,107,0.28)"
                  stroke="currentColor" stroke-width="1.3"/>
            <circle cx="14" cy="38" r="4"
                    fill="rgba(244,211,107,0.35)"
                    stroke="currentColor" stroke-width="1.2"/>
            <circle cx="34" cy="38" r="4"
                    fill="rgba(244,211,107,0.35)"
                    stroke="currentColor" stroke-width="1.2"/>
            <path d="M8 18 H16 M32 18 H40"
                  stroke="currentColor" stroke-width="1.5" opacity="0.7"/>
            <circle cx="24" cy="10" r="2.2" fill="currentColor" opacity="0.8"/>`
    },
    {
      key: 'longhu', name: '龙虎斗', desc: '龙 虎 比 牌 · 押 中 即 赢', tag: '新 品',
      type: 'instant',
      iconImg: '../../assets/images/games/longhu.png',
      svg: `<path d="M8 28 Q6 14 18 10 Q28 8 30 20 Q32 32 22 36 Q12 38 8 28 Z"
                  fill="rgba(220,60,40,0.35)"
                  stroke="currentColor" stroke-width="1.6"/>
            <circle cx="16" cy="20" r="1.5" fill="currentColor"/>
            <path d="M40 28 Q42 14 30 10 Q20 8 18 20 Q16 32 26 36 Q36 38 40 28 Z"
                  fill="rgba(240,170,50,0.30)"
                  stroke="currentColor" stroke-width="1.6"/>
            <circle cx="32" cy="20" r="1.5" fill="currentColor"/>
            <line x1="24" y1="12" x2="24" y2="40"
                  stroke="currentColor" stroke-width="1.8" opacity="0.5"/>
            <rect x="18" y="38" width="12" height="4" rx="1"
                  fill="rgba(244,211,107,0.35)"
                  stroke="currentColor" stroke-width="1.2"/>`
    }
  ];

  // ===== 跑马灯：玩家喜报（mock） + 活动推广 + 平台公告 =====
  //   - 喜报：随机生成 6 条假数据，点了 toast
  //   - 活动 / 公告：取自 App.getMessages，点了跳消息详情
  //   - 横向无缝滚动：复制两份内容拼接，CSS animation 跑 -50% 实现循环
  //   - 滚动速度固定 60s 一周期；如需速度恒定可以按内容宽度算 duration
  function renderMarquee() {
    const items = buildMarqueeItems();
    // 单份内容："item ◆ item ◆ ... ◆ item ◆"（结尾也带 sep）
    // 双份并列：A B → 总宽 = 2W，CSS 跑 -50% 偏移 = 1W，循环时刚好无缝
    const halfChunk = items.map(itemHtml).join(SEP_HTML) + SEP_HTML;
    $('#lmTrack').html(halfChunk + halfChunk);
  }

  const SEP_HTML = '<span class="lm-sep">◆</span>';

  function itemHtml(it) {
    const text = it.type === 'win'
      ? `<span class="lm-emoji">🎉</span><span class="lm-text">${it.text}</span>`
      : it.type === 'activity'
        ? `<span class="lm-emoji">🎁</span><span class="lm-text">${escapeHtml(it.text)}</span>`
        : `<span class="lm-emoji">📢</span><span class="lm-text">${escapeHtml(it.text)}</span>`;
    return `<span class="lm-item" data-type="${it.type}" data-id="${it.id || ''}">${text}</span>`;
  }

  function buildMarqueeItems() {
    const items = [];

    // ---- 6 条喜报 ----
    const TPLS = [
      ({ name, game, amount })       => `${name} 在「${game}」赢得 <span class="num">${amount}</span> 积分`,
      ({ name, game, amount, streak }) => `${name} 在「${game}」连赢 ${streak} 场获 <span class="num">${amount}</span> 积分`,
      ({ name, amount })             => `${name} 单场最大赢取 <span class="num">${amount}</span> 积分`,
      ({ name, bigAmount })          => `${name} 累计有效投注突破 <span class="num">${bigAmount}</span> 万`,
      ({ name, amount })             => `${name} 解锁日积月累终极豪礼 <span class="num">${amount}</span> 积分`
    ];
    for (let i = 0; i < 6; i++) {
      const ctx = {
        name: randName(),
        game: randGame(),
        amount: fmt(randAmount()),
        streak: 3 + Math.floor(Math.random() * 8),       // 3-10
        bigAmount: fmt(50 + Math.floor(Math.random() * 200))   // 50-250 万
      };
      const tpl = TPLS[Math.floor(Math.random() * TPLS.length)];
      items.push({ type: 'win', text: tpl(ctx) });
    }

    // 活动 / 公告条目原本来自消息中心，消息中心整套已下架，此处跑马灯仅滚喜报

    // ---- 洗牌（喜报 / 活动 / 公告 随机交错） ----
    return shuffle(items);
  }

  function randName() {
    const p = App.NAME_PREFIX[Math.floor(Math.random() * App.NAME_PREFIX.length)];
    const s = App.NAME_SUFFIX[Math.floor(Math.random() * App.NAME_SUFFIX.length)];
    return p + s;
  }
  function randGame() {
    return GAMES[Math.floor(Math.random() * GAMES.length)].name.replace(/\s+/g, '');
  }
  function randAmount() {
    // 偏向小金额，少量大金额（视觉真实感）
    const r = Math.random();
    if (r < 0.55) return 500 + Math.floor(Math.random() * 5000);     // 500-5500
    if (r < 0.85) return 5000 + Math.floor(Math.random() * 30000);   // 5k-35k
    return 30000 + Math.floor(Math.random() * 70000);                 // 30k-100k
  }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 跑马灯点击：仅喜报 → toast（消息中心已下架，不再有活动 / 公告条目）
  $('#lmTrack').on('click', '.lm-item', function () {
    App.toast('恭喜！祝您也好运连连');
  });

  // ===== 渲染游戏列表 =====
  // 卡片新结构：上半 .gc-main = 图标 / 居中名字 / 期号+倒计时
  //            下半 .gc-foot = 上一期期号（左）+ 中奖号码槽（右，留空给后期填）
  // 图标优先级：g.iconImg（PS 级精致 PNG）→ fallback 到 g.svg（线描占位）
  function renderGames() {
    const html = GAMES.map(g => {
      const iconHtml = g.iconImg
        ? `<img src="${g.iconImg}?v=2" alt="" />`
        : `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${g.svg}</svg>`;
      return `
        <div class="game-card" data-game="${g.key}" data-type="${g.type || 'instant'}" data-interval="${g.intervalSec || 0}">
          ${g.tag ? `<div class="gc-tag">${g.tag}</div>` : ''}

          <div class="gc-main">
            <div class="gc-icon">${iconHtml}</div>

            <div class="gc-name ${g.name.length >= 5 ? 'gc-name-tight' : ''}">${g.name}</div>

            <div class="gc-status">
              <div class="gc-issue">第 <span class="gc-issue-no">000000</span> 期</div>
              <div class="gc-countdown">--:--</div>
            </div>
          </div>

          <div class="gc-foot">
            <div class="gc-foot-issue"><span class="gc-foot-issue-no">000000</span> 期</div>
            <div class="gc-foot-numbers"></div>
          </div>
        </div>
      `;
    }).join('');
    $('#gamesList').html(html);
    tickAllCards();                                       // 首次立刻刷新一次（避免 1s 空白）
  }

  // ===== 倒计时 / 期号 滴答（每秒一次，全卡片统一刷新） =====
  // 期号方案：以「今日 00:00」为基准，今天的第 N 期；6 位补零（即使每天最多 1440 期也够用）
  // 状态规则：
  //   r > intervalSec - drawSec  → 开奖中（每期开头 drawSec 秒）
  //   freezeSec < r              → 倒计时 mm:ss
  //   r ≤ freezeSec              → 封盘中
  const DRAW_SEC = 2;                 // 每期开头的「开奖中」动画时长
  const FREEZE_SEC = 5;               // 每期结尾的「封盘中」时长

  function todayStartMs() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }
  function pad(n, w) { return String(n).padStart(w, '0'); }
  function fmtIssue6(seq) { return pad(Math.max(1, seq), 6); }
  function fmtMmss(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return pad(Math.floor(s / 60), 2) + ':' + pad(s % 60, 2);
  }

  // 单个卡片 tick：根据 type / interval 算期号 + 倒计时 + 状态
  function tickCard(card) {
    const $card = $(card);
    const type = $card.data('type');
    const interval = Number($card.data('interval')) || 0;

    // 即时游戏：右侧只显示「实时开局 / 随时进入」，底条显示「实时开局」
    if (type !== 'lottery' || interval <= 0) {
      $card.find('.gc-issue-no').text('— —');
      $card.find('.gc-countdown')
        .removeClass('is-freeze is-drawing')
        .addClass('is-instant')
        .text('实时进行');
      $card.find('.gc-foot-issue-no').text('— —');
      return;
    }

    const elapsed = (Date.now() - todayStartMs()) / 1000;
    const seq = Math.floor(elapsed / interval) + 1;       // 今天第几期（从 1 起）
    const r = interval - (elapsed % interval);            // 距离本期截止还剩多少秒（0, interval]

    // 期号：右上 = 当前期；底条 = 上一期（=当前 - 1，今日首期则显示 ------）
    $card.find('.gc-issue-no').text(fmtIssue6(seq));
    $card.find('.gc-foot-issue-no').text(seq > 1 ? fmtIssue6(seq - 1) : '— —');

    const $cd = $card.find('.gc-countdown').removeClass('is-instant');
    if (r > interval - DRAW_SEC) {
      $cd.removeClass('is-freeze').addClass('is-drawing').text('开奖中');
    } else if (r <= FREEZE_SEC) {
      $cd.removeClass('is-drawing').addClass('is-freeze').text('封盘中');
    } else {
      $cd.removeClass('is-freeze is-drawing').text(fmtMmss(r));
    }
  }
  function tickAllCards() {
    $('#gamesList .game-card').each((_, el) => tickCard(el));
  }

  renderGames();
  setInterval(tickAllCards, 1000);                        // 每秒滴答（不会页面卡顿，14 张卡的 DOM 写入很轻）
  renderMarquee();
  maybeShowDailyPromo();

  // ===== 营销弹窗（每次"启动 App"进入大厅时弹一次） =====
  //   - sessionStorage 'promo_shown'：本次会话已弹过 → 切走再回大厅不重弹
  //   - localStorage  'promo_skip_<YYYY-MM-DD>'：勾选了"今日不再提示" → 本自然日都不再弹
  //   - 退出 App 重新打开（新 session）+ 未勾选 → 还会弹
  //   - 内容固定写死：今日特惠 · 首存红利
  function maybeShowDailyPromo() {
    if (sessionStorage.getItem('promo_shown') === '1') return;
    const today = todayKey();
    if (localStorage.getItem('promo_skip_' + today) === '1') return;

    sessionStorage.setItem('promo_shown', '1');

    // 稍微延后一点，让大厅主内容先渲染完，弹窗的"砰"地感觉更强
    setTimeout(() => {
      App.showPromoPopup({
        subtitle: '今 日 特 惠',
        title:    '首 存 红 利 火 热 开 启',
        lines: [
          '新 玩 家 首 次 充 值 即 享 30% 红 利',
          '单 笔 最 高 赠 送 888 积 分',
          '12 倍 流 水 即 可 申 请 下 分',
          '活 动 仅 限 首 次 充 值 玩 家'
        ],
        action: { text: '立 即 参 与', url: '../first-deposit/first-deposit.html' }
      }).then(({ action, skipToday }) => {
        if (skipToday) {
          localStorage.setItem('promo_skip_' + today, '1');
        }
        if (action === 'go') {
          const url = roomNo
            ? `../first-deposit/first-deposit.html?roomNo=${roomNo}`
            : '../first-deposit/first-deposit.html';
          App.go(url);
        }
      });
    }, 400);
  }
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // ===== 游戏卡片点击（整张可点） =====
  const GAME_PAGES = {
    bjsc: '../../../games-assets/bjsc/index.html',
    'speed-racing': '../../../games-assets/speed-racing/index.html',
    'speed-boat': '../../../games-assets/speed-boat/index.html',
    lhc: '../../../games-assets/lhc/index.html',
    zhajinhua: '../../../games-assets/zhajinhua/index.html',
    douniu: '../../../games-assets/douniu/index.html',
    baccarat: '../../../games-assets/baccarat/index.html',
    ffc: '../../../games-assets/ffc/index.html',
    kuai3: '../../../games-assets/kuai3/index.html',
    ssc: '../../../games-assets/ssc/index.html',
    mahjong: '../../../games-assets/mahjong/index.html',
    queen: '../../../games-assets/queen/index.html',
    slots: '../../../games-assets/slots/index.html',
    bcbm: '../../../games-assets/bcbm/index.html',
    longhu: '../../../games-assets/longhu/index.html'
  };
  $('#gamesList').on('click', '.game-card', function () {
    const key = $(this).data('game');
    const g = GAMES.find(x => x.key === key);
    const base = GAME_PAGES[key];
    if (base) {
      const q = roomNo ? `?roomNo=${encodeURIComponent(roomNo)}` : '';
      App.go(base + q);
      return;
    }
    App.toast(`${(g ? g.name : '游戏').replace(/\s+/g, '')} · 即将上线`);
  });

  // ===== 顶部快捷入口（玻璃球已删，此处保留 ACTION_NAMES + handler 作为兜底）
  // VIP / 推广（分享赚钱）模块已从项目下架，对应 key 不再出现 =====
  const ACTION_NAMES = {
    recharge: '充值通道',
    signin:   '每日签到',
    promo:    '优惠活动'
  };

  // 签到按钮上的"今日可领"红点：今天还没签到才显示
  function refreshSigninDot() {
    if (App.canSignToday(user.uid)) $('#signinDot').addClass('show');
    else                            $('#signinDot').removeClass('show');
  }
  refreshSigninDot();

  $('.lh-action').on('click', function () {
    const key = $(this).data('action');
    const goto = {
      recharge: '../recharge/recharge.html',
      signin:   '../signin/signin.html',
      promo:    '../promo/promo.html'
    }[key];
    if (goto) {
      App.go(roomNo ? `${goto}?roomNo=${roomNo}` : goto);
      return;
    }
    App.toast(`${ACTION_NAMES[key] || '该模块'} · 即将开放`);
  });

  // 底部 Tab 由 common.js 自动挂载（按 URL 推断 active）

  // ===== 右上角退出登录 =====
  $('#logoutBtn').on('click', function () {
    App.confirm({
      title: '退 出 账 号',
      message: '退 出 后 需 重 新 登 录 ， 确 定 退 出 当 前 账 号 吗 ？',
      okText: '退 出',
      cancelText: '取 消',
      danger: true,
      icon: 'warn'
    }).then(ok => {
      if (!ok) return;
      App.clearUser();
      App.go('../welcome/welcome.html');
    });
  });

});
