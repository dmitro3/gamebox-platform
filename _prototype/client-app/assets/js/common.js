/**
 * 客户端公共 JS
 * 仅做静态原型阶段需要的最小工具函数
 * 后续接入真实后端时，把 fakeData / fakeApi 部分换成真实 axios/jQuery ajax 调用
 */

window.App = {
  // ====== App 全局信息 ======
  APP_NAME: '金御汇',          // app 显示名（与房间名分开，避免与"黄金一号厅"混淆）
  APP_NAME_EN: 'GoldHub',     // 英文名（备用）
  APP_VERSION: 'v0.1.0',
  APP_SLOGAN: '汇 友 即 金 途',

  // 当前登录用户（原型阶段假数据）
  currentUser: null,

  // ========= 随机用户资料（注册时分配） =========
  // 头像池：本地 162 张图（assets/images/avatars/001.jpg ~ 162.jpg）
  // 注意：编号 022 / 078 / 086 是 .png，其余为 .jpg
  AVATAR_POOL: (function () {
    const pngSet = new Set([22, 78, 86]);
    const arr = [];
    for (let i = 1; i <= 162; i++) {
      const num = String(i).padStart(3, '0');
      const ext = pngSet.has(i) ? 'png' : 'jpg';
      arr.push(`../../assets/images/avatars/${num}.${ext}`);
    }
    return arr;
  })(),

  // 名字前后缀（随机组合）
  NAME_PREFIX: ['黄金','银河','夜行','闪电','深海','炽焰','寒霜','疾风','幻影','星辰','破晓','孤狼','雷霆','流沙','沧海'],
  NAME_SUFFIX: ['猎手','行者','刺客','骑士','大师','旅人','贵族','王者','使者','武士','船长','法师','剑客','少年','侠客'],

  // ========= VIP 等级体系 V0~V10（11 级） =========
  // 等级名（中文），按 vipLevel 索引访问
  VIP_LEVELS: [
    '普通会员', // V0
    '青铜会员', // V1
    '白银会员', // V2
    '黄金一号', // V3
    '黄金二号', // V4
    '铂金贵宾', // V5
    '钻石贵宾', // V6
    '皇冠会员', // V7
    '星耀会员', // V8
    '至尊王者', // V9
    '荣耀帝王'  // V10
  ],
  getVipName(level) {
    const i = Math.max(0, Math.min(10, parseInt(level, 10) || 0));
    return this.VIP_LEVELS[i];
  },

  // 生成一个随机用户（不写入存储）
  genUser() {
    const avatar = this.AVATAR_POOL[Math.floor(Math.random() * this.AVATAR_POOL.length)];
    const name = this.NAME_PREFIX[Math.floor(Math.random() * this.NAME_PREFIX.length)]
               + this.NAME_SUFFIX[Math.floor(Math.random() * this.NAME_SUFFIX.length)];
    const uid = String(Math.floor(100000000 + Math.random() * 900000000)); // 9 位
    // 演示阶段：随机给个 V3-V7 等级，方便看到不同等级的徽章配色；积分给个 5-15 万
    const vipLevel = 3 + Math.floor(Math.random() * 5);
    const points = 10000 * (5 + Math.floor(Math.random() * 11));
    return { avatar, name, uid, registerTime: Date.now(), vipLevel, points };
  },

  // 读取当前用户：没有/旧版数据就自动生成一份并保存（方便单页双击调试）
  // 兼容老数据：缺 vipLevel / points 自动补默认值
  getUser() {
    try {
      const raw = localStorage.getItem('gamebox_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && typeof u.avatar === 'string' &&
            (u.avatar.includes('/') || u.avatar.startsWith('http'))) {
          let changed = false;
          if (!u.registerTime) { u.registerTime = Date.now(); changed = true; }
          if (typeof u.vipLevel !== 'number') {
            u.vipLevel = 3 + Math.floor(Math.random() * 5);
            changed = true;
          }
          if (typeof u.points !== 'number') {
            u.points = 10000 * (5 + Math.floor(Math.random() * 11));
            changed = true;
          }
          if (changed) this.setUser(u);
          return u;
        }
      }
    } catch (_) {}
    const u = this.genUser();
    this.setUser(u);
    return u;
  },

  setUser(user) {
    localStorage.setItem('gamebox_user', JSON.stringify(user));
  },

  clearUser() {
    localStorage.removeItem('gamebox_user');
  },

  // ========= 账号表（注册 / 登录） =========
  // 原型阶段：所有已注册账号都存在浏览器 localStorage 里
  // 真实环境需要替换成后端接口（POST /register, POST /login）
  // 单条记录：{ account, password, avatar, name, uid, registeredAt }
  // 账号统一以小写形式存储，比较时也转小写 → 不区分大小写
  ACCOUNTS_KEY: 'gamebox_accounts',

  // 校验账号格式：必须 8-20 位、英文+数字、且两者都有
  // 返回 null 表示通过；返回字符串表示具体的错误提示
  validateAccount(account) {
    if (!account) return '请输入账号';
    if (account.length < 8) return '账号至少 8 位';
    if (account.length > 20) return '账号最多 20 位';
    if (!/^[A-Za-z0-9]+$/.test(account)) return '账号只能包含英文字母和数字';
    if (!/[A-Za-z]/.test(account)) return '账号必须包含英文字母';
    if (!/[0-9]/.test(account)) return '账号必须包含数字';
    return null;
  },

  getAllAccounts() {
    try {
      const raw = localStorage.getItem(this.ACCOUNTS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch (_) {}
    return [];
  },

  accountExists(account) {
    const key = String(account || '').toLowerCase();
    return this.getAllAccounts().some(a => a.account === key);
  },

  registerAccount(account, password) {
    const profile = this.genUser();
    const record = {
      account: String(account).toLowerCase(),
      password: password,
      avatar: profile.avatar,
      name: profile.name,
      uid: profile.uid,
      registeredAt: Date.now()
    };
    const all = this.getAllAccounts();
    all.push(record);
    localStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(all));
    return record;
  },

  verifyAccount(account, password) {
    const key = String(account || '').toLowerCase();
    return this.getAllAccounts()
      .find(a => a.account === key && a.password === password) || null;
  },

  // ========= 房主 / 代理管理账号（与玩家账号表分离） =========
  STAFF_ACCOUNTS_KEY: 'gamebox_staff_accounts',
  PROXY_SESSION_KEY: 'gamebox_proxy_session',
  AGENT_SESSION_KEY: 'gamebox_agent_session',

  ensureStaffAccounts() {
    const defaults = {
      proxy: [{ account: '1', password: '1', name: '测试代理' }],
      agent: [{ account: '1', password: '1', name: '测试房主' }]
    };
    try {
      const raw = localStorage.getItem(this.STAFF_ACCOUNTS_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.proxy) && data.proxy.length &&
            Array.isArray(data.agent) && data.agent.length) {
          return data;
        }
      }
    } catch (_) {}
    localStorage.setItem(this.STAFF_ACCOUNTS_KEY, JSON.stringify(defaults));
    return defaults;
  },

  verifyStaffAccount(role, account, password) {
    const acc = String(account || '').trim();
    const pwd = String(password || '');
    if (!acc || !pwd) return null;
    const data = this.ensureStaffAccounts();
    const list = role === 'proxy' ? data.proxy : data.agent;
    return list.find(a => a.account === acc && a.password === pwd) || null;
  },

  setStaffSession(role, record) {
    const payload = {
      role,
      account: record.account,
      name: record.name || record.account,
      loginAt: Date.now()
    };
    localStorage.setItem(
      role === 'proxy' ? this.PROXY_SESSION_KEY : this.AGENT_SESSION_KEY,
      JSON.stringify(payload)
    );
  },

  getStaffSession(role) {
    const key = role === 'proxy' ? this.PROXY_SESSION_KEY : this.AGENT_SESSION_KEY;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s && s.account ? s : null;
    } catch (_) {
      return null;
    }
  },

  clearStaffSession(role) {
    localStorage.removeItem(
      role === 'proxy' ? this.PROXY_SESSION_KEY : this.AGENT_SESSION_KEY
    );
  },

  requireStaffSession(role, loginPage) {
    const session = this.getStaffSession(role);
    if (!session) {
      this.go(loginPage);
      return null;
    }
    return session;
  },

  // 修改密码：返回 { ok: true } 或 { ok: false, msg: '...' }
  changePassword(account, oldPwd, newPwd) {
    const key = String(account || '').toLowerCase();
    const all = this.getAllAccounts();
    const idx = all.findIndex(a => a.account === key);
    if (idx < 0) return { ok: false, msg: '账号不存在' };
    if (all[idx].password !== oldPwd) return { ok: false, msg: '当前密码不正确' };
    if (all[idx].password === newPwd) return { ok: false, msg: '新密码不能与当前密码相同' };
    all[idx].password = newPwd;
    localStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(all));
    return { ok: true };
  },

  // ========= 意见反馈（原型阶段：本地存储） =========
  FEEDBACK_KEY: 'feedback_history',
  getFeedbacks() {
    try {
      const arr = JSON.parse(localStorage.getItem(this.FEEDBACK_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  },
  saveFeedback(item) {
    const all = this.getFeedbacks();
    all.unshift(item);
    localStorage.setItem(this.FEEDBACK_KEY, JSON.stringify(all));
  },

  // ========= 已通过审核的房间列表 =========
  // 房间结构：{ roomNo, name, icon }
  //   name 由平台设定（代理不可改）
  //   icon 代理可上传/替换（图片 URL，可以是 http 链接或本地 assets 路径）
  // 默认 icon：AI 渲染的 3D 金色赌场建筑（default-room.png · 256x256）
  // 罗马柱 / 红色绒面拱门 / 红宝石山墙 / 八角形大理石底座 / 温暖窗户灯光
  // 所有新创建的房间都用这张默认图标；代理在后台可上传图片替换
  DEFAULT_ROOM_ICON: '../../assets/images/rooms/default-room.png',
  DEFAULT_ROOMS: [
    { roomNo: '628391', name: '黄金一号厅', icon: '../../assets/images/rooms/default-room.png' },
    { roomNo: '739402', name: '紫钻贵宾室', icon: '../../assets/images/rooms/default-room.png' },
    { roomNo: '184056', name: '夜场专属',   icon: '../../assets/images/rooms/default-room.png' },
    { roomNo: '291847', name: '财神殿',     icon: '../../assets/images/rooms/default-room.png' },
    { roomNo: '506318', name: '欢乐颂',     icon: '../../assets/images/rooms/default-room.png' }
  ],
  // 数据版本号：每次默认数据/图标路径变化时 +1 → 强制清掉旧 localStorage 数据
  ROOMS_VERSION: 4,

  // 读取本账号"已审核通过"的房间
  // 规则：版本号匹配 → 用缓存；版本不匹配/缓存为空 → 重置成 DEFAULT_ROOMS
  getRooms() {
    try {
      const ver = parseInt(localStorage.getItem('gamebox_rooms_version'), 10);
      if (ver === this.ROOMS_VERSION) {
        const raw = localStorage.getItem('gamebox_rooms');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length) return arr;
        }
      }
    } catch (_) {}
    this.setRooms(this.DEFAULT_ROOMS);
    return this.DEFAULT_ROOMS.slice();
  },

  setRooms(rooms) {
    localStorage.setItem('gamebox_rooms', JSON.stringify(rooms));
    localStorage.setItem('gamebox_rooms_version', String(this.ROOMS_VERSION));
  },

  // 该房间是否已审核通过
  hasRoom(roomNo) {
    return this.getRooms().some(r => r.roomNo === roomNo);
  },

  // 审核通过后调用：把房间加入列表（代理在房主端审核控制台通过时会调）
  addRoom(room) {
    const rooms = this.getRooms();
    if (rooms.some(r => r.roomNo === room.roomNo)) return;
    rooms.push(room);
    this.setRooms(rooms);
  },

  clearRooms() {
    localStorage.removeItem('gamebox_rooms');
  },

  // ========= 简单的提示 toast =========
  toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = 'app-toast app-toast-' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.classList.add('show'); }, 10);
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2000);
  },

  // ========= 页面跳转 =========
  go(relativePath) {
    // 所有 page 都在 ../xxx/xxx.html，便于本地双击调试
    location.href = relativePath;
  },

  // ========= 全局确认弹窗 / 提示弹窗（黑金风格，替代 confirm/alert） =========
  //  App.confirm({ title, message, okText, cancelText, danger, icon }) → Promise<boolean>
  //  App.alert({ title, message, okText, icon }) → Promise<void>
  //  支持快捷调用：App.confirm('要退出吗？').then(...)
  _modalSeq: 0,
  _showModal(opts) {
    opts = opts || {};
    const id = 'app-modal-' + (++App._modalSeq);
    const isConfirm = opts._type === 'confirm';
    const title = opts.title || (isConfirm ? '请确认' : '提示');
    const message = opts.message || '';
    const okText = opts.okText || '确 定';
    const cancelText = opts.cancelText || '取 消';
    const danger = !!opts.danger;
    const iconKey = opts.icon || (danger ? 'warn' : (isConfirm ? 'help' : 'info'));

    // 内置 4 种图标（线描金色 / 红色当 danger）
    const ICONS = {
      warn: '<path d="M12 3L2 21h20L12 3z"/><path d="M12 10v5"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/>',
      help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-1 .5-1 1.2-1 2"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none"/>',
      check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>'
    };
    const iconSvg = ICONS[iconKey] ? `
      <div class="app-modal-icon${danger ? ' danger' : ''}">
        <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[iconKey]}</svg>
      </div>
    ` : '';

    const actions = isConfirm
      ? `<button class="app-modal-btn app-modal-btn-cancel" data-act="cancel">${cancelText}</button>
         <button class="app-modal-btn app-modal-btn-ok${danger ? ' danger' : ''}" data-act="ok">${okText}</button>`
      : `<button class="app-modal-btn app-modal-btn-ok${danger ? ' danger' : ''}" data-act="ok">${okText}</button>`;

    const titleCls = iconSvg ? '' : ' no-icon';
    const html = `
      <div class="app-modal-mask" id="${id}-mask"></div>
      <div class="app-modal" id="${id}" role="dialog" aria-modal="true">
        <div class="app-modal-card">
          ${iconSvg}
          <div class="app-modal-title${titleCls}">${title}</div>
          ${message ? `<div class="app-modal-body">${message}</div>` : ''}
          <div class="app-modal-actions">${actions}</div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    const mask = document.getElementById(id + '-mask');
    const modal = document.getElementById(id);

    requestAnimationFrame(() => {
      mask.classList.add('show');
      modal.classList.add('show');
    });

    return new Promise((resolve) => {
      function close(result) {
        mask.classList.remove('show');
        modal.classList.remove('show');
        setTimeout(() => {
          mask.remove();
          modal.remove();
        }, 240);
        resolve(result);
      }
      modal.querySelectorAll('.app-modal-btn').forEach(btn => {
        btn.addEventListener('click', function () {
          const act = this.getAttribute('data-act');
          close(act === 'ok');
        });
      });
      // 点遮罩关闭（仅 confirm 视为取消，alert 仍可关）
      mask.addEventListener('click', function () {
        close(false);
      });
    });
  },
  confirm(arg, opts) {
    // 支持 App.confirm('文案') 或 App.confirm({ title, message, ... })
    const o = typeof arg === 'string' ? { message: arg, ...(opts || {}) } : (arg || {});
    o._type = 'confirm';
    return App._showModal(o);
  },
  alert(arg, opts) {
    const o = typeof arg === 'string' ? { message: arg, ...(opts || {}) } : (arg || {});
    o._type = 'alert';
    o.okText = o.okText || '我 知 道 了';
    return App._showModal(o);
  },

  // ========= 营销弹窗（黑金海报，App 每次启动进大厅弹一次） =========
  //  App.showPromoPopup({
  //    subtitle: '今日特惠',
  //    title:    '首存红利火热开启',
  //    lines:    ['新玩家首充即享 30% 红利', '单笔最高 888 积分', '12 倍流水即可申请下分'],
  //    action:   { text: '立 即 参 与', url: '../first-deposit/first-deposit.html' }
  //  })  → Promise<{ action: 'go' | 'close', skipToday: boolean }>
  //
  // 调用方负责"本次会话只弹一次 / 自然日勾选不再弹"的存储判断（见 game-lobby.js）
  showPromoPopup(opts) {
    opts = opts || {};
    const subtitle = opts.subtitle || '';
    const title    = opts.title || '';
    const lines    = Array.isArray(opts.lines) ? opts.lines : [];
    const action   = opts.action || null;

    // 移除残留实例
    document.querySelectorAll('.app-promo-mask, .app-promo').forEach(el => el.remove());

    const linesHtml = lines.map(s =>
      `<div class="ap-line"><span class="ap-dot">◆</span><span>${s}</span></div>`
    ).join('');

    const actBtn = action
      ? `<button class="ap-btn" data-act="go">${action.text || '立 即 参 与'}</button>`
      : `<button class="ap-btn" data-act="go">我 知 道 了</button>`;

    const html = `
      <div class="app-promo-mask" id="apPromoMask"></div>
      <div class="app-promo" id="apPromo" role="dialog" aria-modal="true">
        <div class="ap-card">
          <button class="ap-close" data-act="close" aria-label="关闭">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>

          ${subtitle ? `
            <div class="ap-subtitle">
              <span class="ap-orn">✦</span>
              <span>${subtitle}</span>
              <span class="ap-orn">✦</span>
            </div>
          ` : ''}

          <div class="ap-title">${title}</div>

          <div class="ap-divider">
            <span class="apd-l"></span>
            <span class="apd-dot">◆</span>
            <span class="apd-r"></span>
          </div>

          <div class="ap-lines">${linesHtml}</div>

          ${actBtn}

          <label class="ap-skip">
            <span class="ap-check" data-state="off">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L20 7"/>
              </svg>
            </span>
            <span class="ap-skip-text">今 天 不 再 提 示</span>
          </label>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    const mask  = document.getElementById('apPromoMask');
    const popup = document.getElementById('apPromo');

    requestAnimationFrame(() => {
      mask.classList.add('show');
      popup.classList.add('show');
    });

    return new Promise((resolve) => {
      let skipToday = false;

      function close(actName) {
        mask.classList.remove('show');
        popup.classList.remove('show');
        setTimeout(() => { mask.remove(); popup.remove(); }, 260);
        resolve({ action: actName, skipToday });
      }

      // 复选框切换
      const check = popup.querySelector('.ap-check');
      popup.querySelector('.ap-skip').addEventListener('click', function (e) {
        e.preventDefault();
        skipToday = !skipToday;
        check.setAttribute('data-state', skipToday ? 'on' : 'off');
      });

      // 按钮 / 关闭
      popup.querySelectorAll('[data-act]').forEach(btn => {
        btn.addEventListener('click', function () {
          close(this.getAttribute('data-act'));
        });
      });

      // 点遮罩关闭（视为 close，不触发 action）
      mask.addEventListener('click', function () { close('close'); });
    });
  },

  // ========= 客服未读消息（按 uid + roomNo 隔离） =========
  CS_UNREAD_PREFIX: 'cs_unread_',
  CS_PENDING_PREFIX: 'cs_pending_',
  CS_MESSAGES_PREFIX: 'cs_messages_',

  _csUnreadKey(uid, roomNo) {
    return App.CS_UNREAD_PREFIX + uid + '_' + (roomNo || 'default');
  },
  getCsUnread(uid, roomNo) {
    return parseInt(localStorage.getItem(App._csUnreadKey(uid, roomNo)) || '0', 10) || 0;
  },
  setCsUnread(uid, roomNo, n) {
    localStorage.setItem(App._csUnreadKey(uid, roomNo), String(Math.max(0, n)));
    App._refreshCsBadge();
  },
  incCsUnread(uid, roomNo) {
    App.setCsUnread(uid, roomNo, App.getCsUnread(uid, roomNo) + 1);
  },
  clearCsUnread(uid, roomNo) {
    App.setCsUnread(uid, roomNo, 0);
  },
  getCsUnreadTotal(uid) {
    const prefix = App.CS_UNREAD_PREFIX + uid + '_';
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf(prefix) === 0) {
        total += parseInt(localStorage.getItem(k) || '0', 10) || 0;
      }
    }
    return total;
  },

  /**
   * 处理跨页面"待回复"队列：
   *   玩家在 cs 页面发消息后，cs.js 会写一条 pending（含预期回复时间 + 回复内容）。
   *   如果用户在 1.5s 内跳到其他页面，cs.js 的 setTimeout 已随上下文销毁，
   *   就靠下一个页面 mountTabbar 时调用本函数补上这条客服回复 + 未读 + 1。
   */
  _processPendingCsReplies() {
    const user = (function () {
      try { return JSON.parse(localStorage.getItem('gamebox_user') || 'null'); }
      catch (_) { return null; }
    })();
    if (!user || !user.uid) return;

    const prefix = App.CS_PENDING_PREFIX + user.uid + '_';
    const toFlush = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf(prefix) === 0) toFlush.push(k);
    }
    toFlush.forEach(k => {
      let p = null;
      try { p = JSON.parse(localStorage.getItem(k) || 'null'); } catch (_) {}
      if (!p || !p.replyAt) { localStorage.removeItem(k); return; }
      if (p.replyAt > Date.now()) return; // 还没到时间

      const roomKey = k.substring(prefix.length);
      const roomNo = roomKey === 'default' ? '' : roomKey;

      // 写入客服消息到 cs_messages
      const msgKey = App.CS_MESSAGES_PREFIX + user.uid + '_' + (roomNo || 'default');
      let msgs = [];
      try { msgs = JSON.parse(localStorage.getItem(msgKey) || '[]'); } catch (_) {}
      msgs.push({ type: 'agent', text: p.text, ts: Date.now() });
      localStorage.setItem(msgKey, JSON.stringify(msgs));

      // 未读 + 1
      App.incCsUnread(user.uid, roomNo);

      // 清掉 pending
      localStorage.removeItem(k);
    });
  },

  // 兼容老代码：等价于刷新所有 tab 红点
  _refreshCsBadge() {
    App._refreshTabBadges();
  },

  // ========= 消息中心（已下架）=========
  // 整个消息中心模块（铃铛 + 列表 + 详情 + 种子数据）已从项目里删除。
  // 这里保留几个空实现做"安全降级"：
  //   - 任何残留调用（比如旧 game-lobby 引跑马灯活动条）走空数组 / 0 / no-op，不抛 ReferenceError
  // 后续如重新启用，恢复 MSG_KEY_PREFIX / getMessages / _saveMessages 等即可
  getMessages()           { return []; },
  getMessageById()        { return null; },
  addMessage()            {},
  markMessageRead()       {},
  markAllMessagesRead()   {},
  deleteMessage()         {},
  getMsgUnreadCount()     { return 0; },

  /**
   * 消息中心种子（已下架）：no-op，保留函数名兜底任何残留调用
   */
  _seedMessagesIfNeeded() { return; },
  _seedMessagesIfNeeded_DEPRECATED(uid) {
    if (!uid) return;
    // 以下原种子数据保留作历史归档；调用入口已被上方 no-op 覆盖。

    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;

    const seed = [
      // 活动推广（3 条）
      {
        id: 'msg_act_001',
        type: 'activity',
        title: '首 存 红 利 火 热 开 启',
        summary: '新玩家首次充值即享 30% 红利，单笔最高赠送 888 积分。',
        body: '尊敬的玩家，您好：\n\n为答谢新用户加入 ' + App.APP_NAME + '，即日起，凡完成账号注册并首次成功充值的玩家，可获得本次充值金额 30% 的额外红利积分，单笔最高 888 积分上限。\n\n• 仅首次充值有效\n• 红利积分与本金合并，需满足 12 倍流水方可申请下分\n• 活动最终解释权归平台所有',
        action: { text: '查 看 活 动 详 情', url: '../first-deposit/first-deposit.html' },
        ts: now - 35 * 60 * 1000,
        read: false
      },
      {
        id: 'msg_act_002',
        type: 'activity',
        title: '连 赢 八 场 · 赢 取 8888 积 分',
        summary: '同一房间连续 8 场胜利即可瓜分百万奖池，最高一次 8888。',
        body: '【连赢八场】每日好礼\n\n在任意房间内，连续 8 场牌局取得胜利，即可根据当日累计有效投注额，瓜分 8888 积分豪礼。\n\n• 中途任一场失败，连胜计数清零\n• 每位玩家每日仅可领取一次最高档奖励\n• 详细分档与计算规则见活动详情页',
        action: { text: '前 往 挑 战', url: '../win-streak/win-streak.html' },
        ts: now - 4 * HOUR,
        read: false
      },
      {
        id: 'msg_act_003',
        type: 'activity',
        title: '日 积 月 累 · 终 极 豪 礼 待 您 解 锁',
        summary: '累计有效投注解锁 6 档大礼，最高豪礼 18,888 积分。',
        body: '【日积月累】活动正在进行中\n\n累计您的每一次有效投注，逐档解锁丰厚奖励，最高档解锁后将获得 18,888 积分终极豪礼一份。\n\n• 投注流水 7 日内有效\n• 已领奖励不影响下一档进度\n• 中途断签不清零，继续累计即可',
        action: { text: '查 看 进 度', url: '../accumulate/accumulate.html' },
        ts: now - 26 * HOUR,
        read: false
      },

      // 公告（2 条）
      {
        id: 'msg_notice_001',
        type: 'notice',
        title: '【 安 全 提 醒 】 请 勿 向 任 何 人 透 露 账 号 密 码',
        summary: '近期发现冒充客服的钓鱼信息，请玩家提高警惕。',
        body: '尊敬的玩家：\n\n近期我们收到反馈，有不法分子冒充平台客服，通过 QQ / 微信 / 电话等方式，要求玩家提供账号、密码、验证码或转账。\n\n请记住：\n• 平台客服 永远不会 主动索取您的密码 / 验证码\n• 任何"协助下分需先转账"的要求 100% 是诈骗\n• 任何活动 不需要您额外缴纳手续费\n\n如有疑问请通过 App 内"客服"按钮联系官方客服。',
        action: { text: '联 系 在 线 客 服', url: '../cs/cs.html' },
        ts: now - 2 * DAY,
        read: false
      },
      {
        id: 'msg_notice_002',
        type: 'notice',
        title: '【 维 护 公 告 】 本 周 日 23:00 - 23:30 系 统 升 级',
        summary: '本周日深夜将进行半小时维护，期间部分房间无法进入。',
        body: '尊敬的玩家：\n\n为提供更稳定的游戏体验，平台将于：\n\n  本 周 日 23:00 - 23:30\n\n进行例行系统升级。期间下列功能将暂时不可用：\n\n• 黄金一号厅 / 紫钻贵宾室 进入受限\n• 上分 / 下分 申请暂停受理\n• 已在牌局内的玩家不受影响，可正常完成本局\n\n如造成不便，敬请谅解。',
        action: null,
        ts: now - 3 * DAY - 6 * HOUR,
        read: false
      },

      // v2 追加
      {
        id: 'msg_act_004',
        type: 'activity',
        title: '周 末 双 倍 积 分 · 整 整 48 小 时',
        summary: '本周六 0:00 至周日 23:59，所有房间有效投注按 2 倍计入回水。',
        body: '【周末双倍】活动公告\n\n活动时间：\n  本 周 六 00:00  —  本 周 日 23:59\n\n活动内容：\n• 活动期间所有房间内的有效投注，自动按 2 倍统计进回水流水\n• 回水比例不变，但因流水翻倍，实际可领回水也翻倍\n• 月签 / 年签 累计天数同样按 2 倍计算（每日上限 1 天）\n\n参与方式：\n• 无需报名，自动参与\n• 实际回水将于次日 06:00 与日常回水合并发放\n\n温馨提示：\n• 系统会自动甄别对刷 / 互刷行为，违规者将取消活动资格',
        action: { text: '查 看 回 水 详 情', url: '../rebate/rebate.html' },
        ts: now - 12 * 60 * 1000,
        read: false
      },
      {
        id: 'msg_notice_003',
        type: 'notice',
        title: '【 重 要 】 平 台 兑 现 规 则 调 整',
        summary: '即日起单笔下分上限调整为 50,000 积分，单日累计不变。',
        body: '尊敬的玩家：\n\n经业务调整，自 2026 年 6 月 1 日起，平台兑现（下分）规则更新如下：\n\n规则变化：\n• 单 笔 下 分 上 限：30,000 → 50,000 积分\n• 单 日 累 计 上 限：保持 200,000 积分不变\n• 单 笔 到 账 时 长：保持 5 分钟内不变\n\n配合调整：\n• VIP3 及以上玩家可申请单笔 100,000 上限（需联系专属客服开通）\n• 大额下分客服会通过 App 内私信进行身份复核，请留意"客服"页消息\n\n如有疑问请联系在线客服。',
        action: { text: '联 系 在 线 客 服', url: '../cs/cs.html' },
        ts: now - 18 * HOUR,
        read: false
      }
    ];

    // 已有列表 + 新种子（按 id 合并，不覆盖已存在的 → 保留用户的已读 / 删除状态）
    const exist = App.getMessages(uid);
    const existIds = new Set(exist.map(function (m) { return m.id; }));
    const missing = seed.filter(function (m) { return !existIds.has(m.id); });
    if (missing.length === 0) return;
    App._saveMessages(uid, exist.concat(missing));
  },

  // ========= 统一刷新底部 Tab 红点（客服 + 我的） =========
  _refreshTabBadges() {
    const user = (function () {
      try { return JSON.parse(localStorage.getItem('gamebox_user') || 'null'); }
      catch (_) { return null; }
    })();
    if (!user || !user.uid) return;

    // 客服 tab：客服未读数（按所有 roomNo 累加）
    App._setTabBadge('cs', App.getCsUnreadTotal(user.uid));

    // 「我的」tab：消息中心已下架（铃铛 + 全套消息页已移除），不再显示未读小红点
  },
  _setTabBadge(tabKey, count) {
    const tab = document.querySelector(`.lobby-tabbar .tab-item[data-tab="${tabKey}"]`);
    if (!tab) return;
    let badge = tab.querySelector('.tab-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'tab-badge';
        tab.appendChild(badge);
      }
      badge.textContent = count > 99 ? '99+' : String(count);
    } else if (badge) {
      badge.remove();
    }
  },

  // ========= 全局底部 Tab（游戏 / 充值 / 明细 / 客服 / 我的） =========
  // 用法：在每个登录后页面的 JS init 时调用一次
  //   App.mountTabbar({ active: 'cs', roomNo });
  //   - active 不传：默认根据当前页面 URL 自动推断
  //   - 若当前页就是 active 对应页，点击不跳；否则跳目标页（透传 roomNo）
  // 已经写过 tabbar 的页面会被自动跳过（不重复挂载）
  mountTabbar(opts) {
    if (document.querySelector('.lobby-tabbar')) return; // 防重复
    opts = opts || {};
    const roomNo = (opts.roomNo || new URLSearchParams(location.search).get('roomNo') || '').trim();
    const qs = roomNo ? `?roomNo=${roomNo}` : '';
    const TABS = [
      { key: 'home',     icon: '⛨', text: '游 戏', url: '../game-lobby/game-lobby.html' },
      { key: 'recharge', icon: '¥', text: '充 值', url: '../recharge/recharge.html' },
      { key: 'flow',     icon: '▤', text: '明 细', url: '../flow/flow.html' },
      { key: 'cs',       icon: '✆', text: '客 服', url: '../cs/cs.html' },
      { key: 'settings', icon: '☰', text: '我 的', url: '../settings/settings.html' }
    ];
    // 自动推断当前页对应的 tab key
    let active = opts.active || null;
    if (!active) {
      const path = location.pathname.toLowerCase();
      if (path.includes('/game-lobby/'))   active = 'home';
      else if (path.includes('/recharge/')) active = 'recharge';
      else if (path.includes('/flow/'))     active = 'flow';
      else if (path.includes('/cs/'))       active = 'cs';
      else if (
        path.includes('/settings/') ||
        path.includes('/message-center/')  // 消息中心是「我的」子页，保持「我的」高亮
      ) active = 'settings';
    }
    const html = `
      <nav class="lobby-tabbar">
        ${TABS.map(t => `
          <div class="tab-item${active === t.key ? ' active' : ''}" data-tab="${t.key}">
            <span class="t-icon">${t.icon}</span>
            <span class="t-text">${t.text}</span>
          </div>
        `).join('')}
      </nav>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    document.body.classList.add('has-tabbar');

    document.querySelectorAll('.lobby-tabbar .tab-item').forEach(el => {
      el.addEventListener('click', function () {
        const k = this.getAttribute('data-tab');
        if (k === active) return;                  // 已在当前页
        const t = TABS.find(x => x.key === k);
        if (!t) return;
        location.href = t.url + qs;
      });
    });

    // 1) 处理跨页面的客服待回复队列（玩家发完消息立刻跳走的情况）
    try { App._processPendingCsReplies(); } catch (_) {}

    // 2) 当前正在 cs 页面 → 标记为已读（清当前房间未读）
    if (active === 'cs') {
      const user = App.getUser();
      if (user && user.uid) App.clearCsUnread(user.uid, roomNo);
    }

    // 3) 首次进入 → 给消息中心塞一批示例消息
    try {
      const u = App.getUser();
      if (u && u.uid) App._seedMessagesIfNeeded(u.uid);
    } catch (_) {}

    // 4) 处理"待审核"奖励申请 → 自动 approve + 加余额 + 推消息
    try { App._processPendingRewards(); } catch (_) {}

    // 5) 刷新所有底部 tab 的红点（客服 + 我的）
    try { App._refreshTabBadges(); } catch (_) {}
  },

  // ========= 假数据（用于本地原型预览） =========
  fakeData: {
    rooms: [
      { roomNo: '628391', name: '黄金一号厅', games: ['lucky-wheel', 'fishing'] }
    ],
    applications: [
      { id: 'a001', roomNo: '628391', status: 'pending', appliedAt: '2026-05-28 18:30' }
    ]
  },

  // 模拟接口延时
  delay(ms = 600) { return new Promise(r => setTimeout(r, ms)); }
};

/* ========================================================================
 * ⚠️  TODO · 上线前必须删除这整段 IIFE  ⚠️
 * ------------------------------------------------------------------------
 * 临时调试用：在账号表为空时注入一个测试账号 (账号=1 / 密码=1)
 * 仅为方便开发期间快速登录，绕过了"8 位英文+数字"的注册校验。
 *
 * 上线 / 接后端前的清理动作：
 *   1. 删除下面整个 (function seedTestAccount() { ... })() 块
 *   2. 提醒用户清一次浏览器 localStorage，否则旧种子还会残留
 * ======================================================================== */
(function seedTestAccount() {
  try {
    const all = App.getAllAccounts();
    if (all.length === 0) {
      const seed = {
        account: '1',
        password: '1',
        avatar: '../../assets/images/avatars/001.jpg',
        name: '测试玩家',
        uid: '100000001',
        registeredAt: Date.now(),
        seed: true
      };
      localStorage.setItem(App.ACCOUNTS_KEY, JSON.stringify([seed]));
    }
  } catch (_) {}
})();
/* ========================== END OF TEMP SEED ============================ */

/* ========================================================
   全局点击音效（默认开启）
   - 通过 Web Audio API 合成短促 880Hz "嘀" 声，不依赖外部音频文件
   - 用户可在「我的 → 账号管理 → 点击音效」开关里关闭
   - 开关状态存 localStorage['app_sound']：'on' / 'off'
   - iOS Safari 限制：AudioContext 必须在用户手势中 resume，下面在每次 click 内统一处理
   ======================================================== */
App.SOUND_KEY = 'app_sound';
App.getSoundOn = function () {
  // 未设置过 = 默认开启
  return localStorage.getItem(App.SOUND_KEY) !== 'off';
};
App.setSoundOn = function (on) {
  localStorage.setItem(App.SOUND_KEY, on ? 'on' : 'off');
};

App._audioCtx = null;
App._lastClickTone = 0;

// 创建一次性的 oscillator 并发声
function _fireClickTone(ctx) {
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;       // A5 清脆短促
    o.connect(g);
    g.connect(ctx.destination);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.start(t);
    o.stop(t + 0.08);
  } catch (_) {}
}

App.playClickSound = function () {
  if (!App.getSoundOn()) return;
  // 节流：80ms 内只响一次，避免 pointerdown 后又 click 的双响、连点音爆
  const now = (performance && performance.now) ? performance.now() : Date.now();
  if (now - App._lastClickTone < 80) return;
  App._lastClickTone = now;

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!App._audioCtx) {
    try { App._audioCtx = new Ctx(); } catch (_) { return; }
  }
  const ctx = App._audioCtx;
  // suspended（iOS/Chrome autoplay policy）→ 等 resume 完再调度 oscillator
  // 否则 currentTime=0 的 80ms 播放窗口会在 resume 后被瞬间跳过 → 第一声丢
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => _fireClickTone(ctx)).catch(() => {});
  } else {
    _fireClickTone(ctx);
  }
};

/*
 * 全局指针按下监听（capture 阶段，最早捕获）
 * 用 pointerdown 而不是 click：
 *   - 比 click 早 100~300ms 触发，反馈更即时
 *   - 统一覆盖鼠标 / 触摸 / 笔
 *   - 即使子元素 stopPropagation，capture 阶段也已经先响过
 *   - iOS 上某些 div 的 tap 不冒泡 click，pointerdown 一定有
 * 不支持 PointerEvent 的老浏览器降级到 mousedown + touchstart。
 */
(function attachClickSound() {
  const opts = { capture: true, passive: true };
  if ('onpointerdown' in window) {
    document.addEventListener('pointerdown', App.playClickSound, opts);
  } else {
    document.addEventListener('mousedown', App.playClickSound, opts);
    document.addEventListener('touchstart', App.playClickSound, opts);
  }
})();

/* ========================================================
   全局背景音乐（默认开启）
   - 本地 mp3 循环：assets/audio/1.mp3
   - 用户可在「我的 → 账号管理 → 背景音乐」开关里关闭
   - 开关状态存 localStorage['bgm_on_<uid>']：'1' / '0'（未设置 = 开启）
   - 首次播放可能需用户点击（浏览器自动播放策略）
   ======================================================== */
App._bgmState = null;
App._bgmPlaying = false;
App._bgmResumeHandler = null;
App._bgmUrlCached = null;
App.BGM_FILE = '1.mp3';
App.BGM_VOLUME = 0.09;

App._getBgmUrl = function () {
  if (App._bgmUrlCached) return App._bgmUrlCached;
  const scripts = document.getElementsByTagName('script');
  for (let i = scripts.length - 1; i >= 0; i--) {
    const src = scripts[i].getAttribute('src');
    if (src && /common\.js/.test(src)) {
      try {
        App._bgmUrlCached = new URL('../audio/' + App.BGM_FILE, src).href;
        return App._bgmUrlCached;
      } catch (_) {}
    }
  }
  App._bgmUrlCached = '../../assets/audio/' + App.BGM_FILE;
  return App._bgmUrlCached;
};

App._bgmStorageKey = function (uid) {
  if (!uid) {
    try {
      const u = App.getUser();
      uid = u && u.uid;
    } catch (_) {}
  }
  return uid ? `bgm_on_${uid}` : 'bgm_on_guest';
};

App.getBgmOn = function (uid) {
  return localStorage.getItem(App._bgmStorageKey(uid)) !== '0';
};

App.setBgmOn = function (on, uid) {
  localStorage.setItem(App._bgmStorageKey(uid), on ? '1' : '0');
  if (on) App.startBgm();
  else App.stopBgm();
};

function _detachBgmResumeHandler() {
  if (!App._bgmResumeHandler) return;
  const fn = App._bgmResumeHandler;
  document.removeEventListener('pointerdown', fn, true);
  document.removeEventListener('mousedown', fn, true);
  document.removeEventListener('touchstart', fn, true);
  App._bgmResumeHandler = null;
}

function _attachBgmResumeHandler(callback) {
  if (App._bgmResumeHandler) return;
  App._bgmResumeHandler = function () {
    _detachBgmResumeHandler();
    if (!App.getBgmOn() || App._bgmPlaying) return;
    callback();
  };
  const opts = { capture: true, passive: true };
  if ('onpointerdown' in window) {
    document.addEventListener('pointerdown', App._bgmResumeHandler, opts);
  } else {
    document.addEventListener('mousedown', App._bgmResumeHandler, opts);
    document.addEventListener('touchstart', App._bgmResumeHandler, opts);
  }
}

function _getOrCreateBgmAudio() {
  if (App._bgmState && App._bgmState.audio) return App._bgmState.audio;
  const audio = new Audio(App._getBgmUrl());
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0;
  App._bgmState = { audio: audio, fadeTimer: null };
  return audio;
}

function _fadeBgmVolume(target, durationSec, done) {
  const st = App._bgmState;
  if (!st || !st.audio) {
    if (done) done();
    return;
  }
  const audio = st.audio;
  if (st.fadeTimer) {
    clearInterval(st.fadeTimer);
    st.fadeTimer = null;
  }
  const start = audio.volume;
  const steps = 16;
  const stepMs = Math.max(20, (durationSec * 1000) / steps);
  let i = 0;
  st.fadeTimer = setInterval(function () {
    i++;
    audio.volume = start + (target - start) * (i / steps);
    if (i >= steps) {
      clearInterval(st.fadeTimer);
      st.fadeTimer = null;
      audio.volume = target;
      if (done) done();
    }
  }, stepMs);
}

function _tearDownBgmAudio() {
  const st = App._bgmState;
  if (!st) return;
  if (st.fadeTimer) {
    clearInterval(st.fadeTimer);
    st.fadeTimer = null;
  }
  const audio = st.audio;
  if (audio) {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (_) {}
  }
  App._bgmState = null;
}

App.startBgm = function () {
  if (!App.getBgmOn() || App._bgmPlaying) return;

  const audio = _getOrCreateBgmAudio();

  const play = function () {
    if (!App.getBgmOn()) return;
    audio.play().then(function () {
      App._bgmPlaying = true;
      _fadeBgmVolume(App.BGM_VOLUME, 0.8);
      _detachBgmResumeHandler();
    }).catch(function () {
      App._bgmPlaying = false;
      _attachBgmResumeHandler(play);
    });
  };

  play();
};

App.stopBgm = function () {
  App._bgmPlaying = false;
  _detachBgmResumeHandler();
  const st = App._bgmState;
  if (!st || !st.audio) return;
  _fadeBgmVolume(0, 0.5, _tearDownBgmAudio);
};

(function initBgmOnLoad() {
  function tryStart() {
    if (App.getBgmOn()) App.startBgm();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryStart);
  } else {
    tryStart();
  }
})();

/* ========================================================
   积分余额（原型阶段：localStorage 模拟，按 uid 单账户）
   - 后端接入后，把 getBalance / adjustBalance 改成接口调用即可
   - key 形如 gamebox_balance_<uid>，避免与其他 storage 冲突
   ======================================================== */
App.BALANCE_KEY_PREFIX = 'gamebox_balance_';
App.DEFAULT_BALANCE = 88888;

App.getBalance = function (uid) {
  if (!uid) return App.DEFAULT_BALANCE;
  const raw = localStorage.getItem(App.BALANCE_KEY_PREFIX + uid);
  if (raw === null) return App.DEFAULT_BALANCE;
  const n = parseInt(raw, 10);
  return isNaN(n) ? App.DEFAULT_BALANCE : n;
};
App.setBalance = function (uid, val) {
  if (!uid) return;
  const n = Math.max(0, Math.floor(Number(val) || 0));
  localStorage.setItem(App.BALANCE_KEY_PREFIX + uid, String(n));
};
// delta 正数 = 增加，负数 = 扣减；返回扣减后的新余额（不会跌破 0）
App.adjustBalance = function (uid, delta) {
  if (!uid) return App.DEFAULT_BALANCE;
  const cur = App.getBalance(uid);
  const next = Math.max(0, cur + Math.floor(Number(delta) || 0));
  App.setBalance(uid, next);
  return next;
};

/* ========================================================
   奖励申请记录（签到 / 红包 / 任务等系统发放）
   - 与"上下分"分开，因为是平台主动发的、走客服审核
   - 流转：pending → approved（积分到账）/ rejected
   - 真实环境下：客户端 saveReward → 服务端 → 客服后台审批
   - 原型阶段：使用 saveReward 之后，mountTabbar 会自动模拟"客服审核通过"
     （写入 5 秒后判定为已通过）→ adjustBalance + 推送一条消息中心通知
   ======================================================== */
App.REWARD_KEY_PREFIX = 'reward_history_';
App.REWARD_AUTO_APPROVE_MS = 5000;   // 客服自动审核延迟（原型用）

/* ========================================================
   投注风控规则（全局，由 admin-panel 后台设置）
   - 玩家端不可见 / 不可改，只在投注时静默校验
   - 原型阶段写死；后续 admin 做完后改成从 server 读取
   - 提供 App.checkBetLimit(stake) 给具体游戏调用，超限自动 toast 拦截
   ======================================================== */
App.BET_RULES = {
  maxSingleStake: 50000   // 单局最高下注上限
};

/**
 * 校验单笔下注金额是否合规
 * @param {number} stake  本次下注金额（≥ 0）
 * @returns {boolean}     true = 通过；false = 超限（已自动 toast 提示）
 *
 * 用法（在游戏页面投注按钮里）：
 *   if (!App.checkBetLimit(stake)) return;   // 拦截并提示，停止后续下注流程
 *   // ……正常扣减积分、提交注单……
 */
App.checkBetLimit = function (stake) {
  const max = (App.BET_RULES && App.BET_RULES.maxSingleStake) || 0;
  if (max > 0 && Number(stake) > max) {
    if (typeof App.toast === 'function') {
      App.toast('已 超 出 当 局 最 高 下 注 上 限');
    }
    return false;
  }
  return true;
};

App._rewardKey = function (uid) { return App.REWARD_KEY_PREFIX + uid; };

App.getRewards = function (uid) {
  if (!uid) return [];
  try {
    const arr = JSON.parse(localStorage.getItem(App._rewardKey(uid)) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (_) { return []; }
};
App._saveRewards = function (uid, arr) {
  localStorage.setItem(App._rewardKey(uid), JSON.stringify(arr.slice(0, 300)));
};
App.saveReward = function (uid, item) {
  const arr = App.getRewards(uid);
  arr.unshift(Object.assign({
    id: 'rw_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    status: 'pending',
    appliedAt: Date.now()
  }, item));
  App._saveRewards(uid, arr);
};

/**
 * 处理"待审核"奖励：原型阶段模拟客服 5 秒后审批通过
 *   - 每次 mountTabbar 调用一次
 *   - 已过 REWARD_AUTO_APPROVE_MS 的 pending → 状态变 approved + adjustBalance + 给消息中心推送"奖励已到账"
 */
App._processPendingRewards = function () {
  const user = (function () {
    try { return JSON.parse(localStorage.getItem('gamebox_user') || 'null'); }
    catch (_) { return null; }
  })();
  if (!user || !user.uid) return;

  const arr = App.getRewards(user.uid);
  if (!arr.length) return;
  let changed = false;
  const now = Date.now();
  arr.forEach(r => {
    if (r.status !== 'pending') return;
    if (now - (r.appliedAt || 0) < App.REWARD_AUTO_APPROVE_MS) return;
    r.status = 'approved';
    r.approvedAt = now;
    // 到账
    App.adjustBalance(user.uid, r.amount || 0);
    // 推送一条个人通知到消息中心（活动类，玩家可以点进详情）
    try {
      App.addMessage(user.uid, {
        id: 'msg_rw_' + r.id,
        type: 'activity',
        title: r.title || '签 到 奖 励 已 到 账',
        summary: `您的「${r.desc || '签到奖励'}」${r.amount} 积分已到账，感谢支持。`,
        body: `尊敬的玩家，您好：\n\n您于 ${new Date(r.appliedAt).toLocaleString('zh-CN')} 申请的奖励：\n\n  • 项目：${r.desc || '签到奖励'}\n  • 金额：${r.amount} 积分\n\n现已通过客服审核并发放到您的账户，您当前余额为：${App.getBalance(user.uid)} 积分。\n\n感谢您的支持，祝您游戏愉快。`,
        action: null,
        ts: now,
        read: false
      });
    } catch (_) {}
    changed = true;
  });
  if (changed) App._saveRewards(user.uid, arr);
};

/* ========================================================
   每日签到状态（周签 / 月签 / 年签 三层）
   - 周签：连续签到（漏签归零），weekStreak % 7 = weekDay，第 7 天领翻牌
   - 月签：本月累计签到天数（不连续也算），按月份切换重置
   - 年签：本年累计签到天数，按年份切换重置
   - 数据结构：见 getSigninState 返回
   - 漏签判定：lastDate 不是"今天"或"昨天"则视为漏签，weekStreak 重置为 0
   ======================================================== */
App.SIGNIN_KEY_PREFIX = 'signin_';

App._signinKey = function (uid) { return App.SIGNIN_KEY_PREFIX + uid; };

App._dateKey = function (d) {
  d = d || new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
};
App._monthKey = function (d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
};
App._yearKey = function (d) {
  d = d || new Date();
  return String(d.getFullYear());
};

// 周签 7 天奖励梯度（固定）
App.SIGNIN_WEEK_REWARDS = [100, 200, 300, 500, 800, 1500, 'flip'];   // 'flip' = 翻牌
App.SIGNIN_WEEK_FLIP_OPTIONS = [100, 300, 888, 8888];                  // 翻牌 4 个奖池档
App.SIGNIN_MONTH_REWARD = 5000;                                         // 月签满 30 天
App.SIGNIN_YEAR_REWARD  = 88888;                                        // 年签满 365 天

App.getSigninState = function (uid) {
  let s = {
    lastDate: '',
    weekStreak: 0,       // 当前周期内的第几天（1-7 循环，不归零）
    totalStreak: 0,      // 真实总连签天数（漏签归 0）
    monthCount: 0,
    monthRef: App._monthKey(),
    yearCount: 0,
    yearRef: App._yearKey(),
    history: [],         // 最近若干次签到日期（仅用于日历展示）
    monthBonusClaimed: false,
    yearBonusClaimed: false
  };
  if (!uid) return s;
  try {
    const raw = localStorage.getItem(App._signinKey(uid));
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') s = Object.assign(s, obj);
    }
  } catch (_) {}
  // 月 / 年切换时自动重置计数与对应已领奖标志
  const curMonth = App._monthKey();
  const curYear = App._yearKey();
  if (s.monthRef !== curMonth) {
    s.monthCount = 0;
    s.monthBonusClaimed = false;
    s.monthRef = curMonth;
  }
  if (s.yearRef !== curYear) {
    s.yearCount = 0;
    s.yearBonusClaimed = false;
    s.yearRef = curYear;
  }
  return s;
};
App.saveSigninState = function (uid, s) {
  if (!uid) return;
  localStorage.setItem(App._signinKey(uid), JSON.stringify(s));
};

App.canSignToday = function (uid) {
  return App.getSigninState(uid).lastDate !== App._dateKey();
};

/**
 * 执行签到：推进状态 + 写一条 reward 申请（pending，5 秒后自动审核通过）
 * 返回 { ok, weekDay, isWeekBonus, reward, state, monthHit, yearHit }
 *   - reward: 数字（普通日积分） 或 'flip'（第 7 天翻牌）
 *   - monthHit / yearHit: 本次签到是否刚好满足月/年签条件，UI 可触发"额外大奖"
 */
App.doSignIn = function (uid) {
  if (!uid) return { ok: false, msg: '未登录' };
  const today = App._dateKey();
  const s = App.getSigninState(uid);
  if (s.lastDate === today) return { ok: false, msg: '今日已签到' };

  // 漏签判断（昨天日期）
  const yesterday = App._dateKey(new Date(Date.now() - 86400000));
  if (s.lastDate === yesterday) {
    // 连续：weekStreak 在 1-7 之间循环（7 之后回到 1）
    s.weekStreak = (s.weekStreak % 7) + 1;
    s.totalStreak = (s.totalStreak || 0) + 1;
  } else {
    // 漏签 / 首签：从第 1 天开始
    s.weekStreak = 1;
    s.totalStreak = 1;
  }
  // 月 / 年累计 + 1（getSigninState 已处理月年切换）
  s.monthCount += 1;
  s.yearCount  += 1;
  s.lastDate = today;
  s.history = (s.history || []).concat([today]).slice(-40);

  const weekDay = s.weekStreak;
  const isWeekBonus = weekDay === 7;
  const reward = App.SIGNIN_WEEK_REWARDS[weekDay - 1];   // number 或 'flip'

  // 月 / 年是否刚好达成？（每月/每年只领一次）
  const monthHit = (s.monthCount >= 30 && !s.monthBonusClaimed);
  const yearHit  = (s.yearCount  >= 365 && !s.yearBonusClaimed);

  App.saveSigninState(uid, s);

  // 普通日（reward 是数字）→ 立刻写一条 pending reward
  // 翻牌（reward === 'flip'）→ 等玩家翻完牌再由 signin.js 写 reward
  if (typeof reward === 'number') {
    App.saveReward(uid, {
      type: 'signin',
      cycle: 'week',
      day: weekDay,
      amount: reward,
      desc: `第 ${weekDay} 天签到奖励`,
      title: '签 到 奖 励 已 到 账'
    });
  }
  return { ok: true, weekDay, isWeekBonus, reward, state: s, monthHit, yearHit };
};

// 月签翻牌：领取月签大奖（玩家在 signin 页主动点）
App.claimMonthBonus = function (uid) {
  const s = App.getSigninState(uid);
  if (s.monthBonusClaimed) return { ok: false, msg: '本月已领取' };
  if (s.monthCount < 30) return { ok: false, msg: '本月签到不足 30 天' };
  s.monthBonusClaimed = true;
  App.saveSigninState(uid, s);
  App.saveReward(uid, {
    type: 'signin', cycle: 'month',
    amount: App.SIGNIN_MONTH_REWARD,
    desc: `${s.monthRef} 月签满 30 天豪礼`,
    title: '月 签 豪 礼 已 到 账'
  });
  return { ok: true, amount: App.SIGNIN_MONTH_REWARD };
};

// 年签：领取年度大奖
App.claimYearBonus = function (uid) {
  const s = App.getSigninState(uid);
  if (s.yearBonusClaimed) return { ok: false, msg: '本年已领取' };
  if (s.yearCount < 365) return { ok: false, msg: '本年签到不足 365 天' };
  s.yearBonusClaimed = true;
  App.saveSigninState(uid, s);
  App.saveReward(uid, {
    type: 'signin', cycle: 'year',
    amount: App.SIGNIN_YEAR_REWARD,
    desc: `${s.yearRef} 年签满 365 天终极豪礼`,
    title: '年 度 终 极 豪 礼 已 到 账'
  });
  return { ok: true, amount: App.SIGNIN_YEAR_REWARD };
};

// 周签第 7 天翻牌（在 signin 页玩家翻完后调用）
App.claimWeekFlip = function (uid, amount) {
  if (!App.SIGNIN_WEEK_FLIP_OPTIONS.includes(amount)) return { ok: false };
  App.saveReward(uid, {
    type: 'signin', cycle: 'week-flip',
    amount: amount,
    desc: `第 7 天翻牌大奖`,
    title: '翻 牌 大 奖 已 到 账'
  });
  return { ok: true, amount };
};

/* ========================================================
   上下分申请记录（原型阶段：localStorage，按全局列表保存）
   - type: 'up' / 'down'
   - status: 'pending' / 'approved' / 'rejected'
   - 后续客服端会读这个列表来审核
   ======================================================== */
App.RECHARGE_KEY = 'recharge_history';
App.getRecharges = function () {
  try { return JSON.parse(localStorage.getItem(App.RECHARGE_KEY) || '[]'); }
  catch (_) { return []; }
};
App.saveRecharge = function (item) {
  const arr = App.getRecharges();
  arr.unshift(item);
  localStorage.setItem(App.RECHARGE_KEY, JSON.stringify(arr.slice(0, 200)));
};

/** 充值申请提交后，把自动生成的文案写入客服聊天记录 */
App.appendCsUserMessage = function (uid, roomNo, text) {
  text = String(text || '').trim();
  if (!uid || !text) return;
  const msgKey = App.CS_MESSAGES_PREFIX + uid + '_' + (roomNo || 'default');
  let msgs = [];
  try { msgs = JSON.parse(localStorage.getItem(msgKey) || '[]'); } catch (_) {}
  msgs.push({ type: 'user', text, ts: Date.now() });
  try { localStorage.setItem(msgKey, JSON.stringify(msgs)); } catch (_) {}
};

/* ========= 注入 toast 样式（避免改 common.css） ========= */
(function injectToastCss() {
  const css = `
    .app-toast {
      position: fixed; left: 50%; bottom: 80px; transform: translate(-50%, 20px);
      padding: 10px 18px; border-radius: 999px; font-size: 14px;
      background: rgba(20, 14, 10, 0.95); color: #f5c842;
      border: 1px solid #3a2f25; opacity: 0; transition: all 0.3s;
      z-index: 9999;
    }
    .app-toast.show { opacity: 1; transform: translate(-50%, 0); }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ========================================================
   会话超时（App 切到后台 ≥ 1 分钟 自动登出 → 重新走开场动画 + 重新登录）
   - 机制：
     1) 前台时每 5 秒"心跳"刷新 lastActive 时间戳
     2) visibilitychange 切到后台 → 停止心跳；切回前台 → 检查时间差
     3) 任何登录后页面 load 时也检查一次（覆盖"完全关闭再打开"的场景）
     4) 一旦判定超时 → clearUser + 跳 splash
   - 豁免页面（splash / welcome / register 等本来就无登录态）不触发检查
   ======================================================== */
App.SESSION_TIMEOUT_MS = 60 * 1000;          // 后台 60 秒 = 超时
App.SESSION_HEARTBEAT_MS = 5 * 1000;         // 前台心跳间隔
App.SESSION_KEY = 'gamebox_last_active';

App.touchSession = function () {
  if (!localStorage.getItem('gamebox_user')) return;
  localStorage.setItem(App.SESSION_KEY, String(Date.now()));
};
App.isSessionExpired = function () {
  const t = parseInt(localStorage.getItem(App.SESSION_KEY) || '0', 10);
  if (!t) return false;
  return (Date.now() - t) > App.SESSION_TIMEOUT_MS;
};
App.clearSession = function () {
  localStorage.removeItem(App.SESSION_KEY);
};
App.forceLogoutToSplash = function () {
  App.clearUser();
  App.clearSession();
  try { sessionStorage.clear(); } catch (_) {}
  // 已经在 splash 页就不重复跳
  if (location.pathname.toLowerCase().indexOf('/splash/') < 0) {
    location.href = '../splash/splash.html';
  }
};

(function setupSessionWatcher() {
  // 不在会话内的页面（登录前 / 启动动画 / 容错页）不监听
  const EXEMPT = [
    '/splash/', '/welcome/', '/register/', '/agent-login/', '/proxy-login/', '/referral-input/',
    '/approval-list/', '/proxy-console/', '/agent-console/',
    '/empty/', '/maintenance/', '/offline/'
  ];
  const path = location.pathname.toLowerCase();
  const isExempt = EXEMPT.some(p => path.indexOf(p) >= 0);

  // —— 心跳 —— //
  let hbTimer = null;
  function startHeartbeat() {
    stopHeartbeat();
    hbTimer = setInterval(function () {
      if (!document.hidden && localStorage.getItem('gamebox_user')) {
        App.touchSession();
      }
    }, App.SESSION_HEARTBEAT_MS);
  }
  function stopHeartbeat() {
    if (hbTimer) { clearInterval(hbTimer); hbTimer = null; }
  }

  // —— 前后台切换 —— //
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stopHeartbeat();
      // 不在这里清，超时判定靠"切回前台"时检查时间差
    } else {
      if (isExempt) return;
      if (localStorage.getItem('gamebox_user')) {
        if (App.isSessionExpired()) {
          App.forceLogoutToSplash();
          return;
        }
        App.touchSession();
        startHeartbeat();
      }
    }
  });

  // —— 页面加载时检查（覆盖"完全关闭 App 后重开"的场景）—— //
  function onReady() {
    if (isExempt) return;
    if (localStorage.getItem('gamebox_user')) {
      if (App.isSessionExpired()) {
        App.forceLogoutToSplash();
        return;
      }
      App.touchSession();
      startHeartbeat();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();

/* ========================================================
   全局轻量轮询：处理"待审核"奖励 + 刷新 tab 红点
   - 每 5 秒一次，开销极小
   - 让玩家停在某一页（如 signin / cs）也能等到奖励到账 / 消息推送
   ======================================================== */
setInterval(function () {
  try { App._processPendingRewards(); } catch (_) {}
  try { App._refreshTabBadges();      } catch (_) {}
}, 5000);

/* ========================================================
   自动挂载全局底部 Tab（所有"登录后页面"统一固定在底部）
   - 排除：登录类、注册、绑定房间、房主端、游戏内
   - 已挂载过（页面 JS 主动调用 mountTabbar）则不重复挂
   ======================================================== */
(function () {
  const EXCLUDE = [
    '/welcome/',
    '/register/',
    '/agent-login/',
    '/proxy-login/',   // 代理登录页（与 agent-login 同属未登录态）
    '/referral-input/',
    '/approval-list/',
    '/proxy-console/',
    '/agent-console/',
    '/admin-panel/',
    '/games-assets/',  // 游戏内不显示
    '/splash/',        // 启动页不显示
    '/empty/',         // 容错页不显示
    '/maintenance/',
    '/offline/'
  ];
  function autoMount() {
    if (document.querySelector('.lobby-tabbar')) return;
    const path = location.pathname.toLowerCase();
    if (EXCLUDE.some(p => path.includes(p))) return;
    if (typeof App.mountTabbar === 'function') App.mountTabbar();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }
})();
