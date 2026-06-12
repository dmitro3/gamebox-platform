/**
 * 个人资料页（原型 / mock）
 *
 * 字段 policy：
 *   - daily：每日可改一次（头像 / 昵称）
 *       存最近一次修改日期 → 同日再次点击会 toast 拦截
 *   - once ：仅可填写一次（性别 / 出生日期 / 手机号 / 邮箱）
 *       存 confirmed 标记 → 已确认后点击会 toast 拦截
 *
 * 数据存储：localStorage[`profile_${user.uid}`]，按账户隔离：
 *   {
 *     avatar, avatarUpdatedAt,
 *     nickname, nicknameUpdatedAt,
 *     gender,    genderConfirmed,
 *     birthday,  birthdayConfirmed,
 *     phone,     phoneConfirmed,
 *     email,     emailConfirmed
 *   }
 *
 * 后期上线：所有读写改成 GET/POST /api/profile，server 端做权威 policy 校验
 */
$(function () {

  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();

  // ===== 基础账户信息 =====
  const user = App.getUser();
  const STORAGE_KEY = `profile_${user.uid}`;
  let profile = readProfile();

  function readProfile() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function saveProfile() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }

  // ===== 字段元数据 =====
  // policy: 'daily' | 'once'
  // label: 字段中文名
  // valId: DOM 显示值的元素 id
  // sideId: DOM 右侧状态元素 id
  const FIELDS = {
    nickname:  { policy: 'daily', label: '昵 称',      valId: 'valNickname', sideId: 'sideNickname' },
    realname:  { policy: 'once',  label: '真 实 姓 名', valId: 'valRealname', sideId: 'sideRealname' },
    gender:    { policy: 'once',  label: '性 别',      valId: 'valGender',   sideId: 'sideGender'   },
    birthday:  { policy: 'once',  label: '出 生 日 期', valId: 'valBirthday', sideId: 'sideBirthday' },
    phone:     { policy: 'once',  label: '手 机 号 码', valId: 'valPhone',    sideId: 'sidePhone'    },
    email:     { policy: 'once',  label: '电 子 邮 箱', valId: 'valEmail',    sideId: 'sideEmail'    }
  };

  function todayStr() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // 字段当前是否被锁定（不可再改）
  function isLocked(field) {
    const f = FIELDS[field];
    if (!f) return false;
    if (f.policy === 'once')  return !!profile[field + 'Confirmed'];
    if (f.policy === 'daily') return profile[field + 'UpdatedAt'] === todayStr();
    return false;
  }

  // 字段当前显示文本（真实姓名 / 手机 / 邮箱 都做脱敏）
  function displayValue(field) {
    const v = profile[field];
    if (!v) return null;
    if (field === 'gender')   return v === 'M' ? '男' : v === 'F' ? '女' : v;
    if (field === 'phone')    return v.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
    if (field === 'email')    return v.replace(/^(.).+(@.+)$/, (_, a, b) => a + '***' + b);
    if (field === 'realname') {
      // 保留首末字，中间替换为 *：王某某 → 王*某；张三 → 张*；李艾米 → 李*米
      if (v.length <= 1) return v;
      if (v.length === 2) return v[0] + '*';
      return v[0] + '*'.repeat(v.length - 2) + v[v.length - 1];
    }
    return v;
  }

  // ===== 渲染整页 =====
  function renderAll() {
    // 头像（profile 优先，否则用账户默认头像）
    $('#userAvatar').attr('src', profile.avatar || user.avatar);
    // 头像状态提示
    const avatarLockedToday = profile.avatarUpdatedAt === todayStr();
    $('#avatarHint')
      .text(avatarLockedToday ? '今 日 已 修 改，明 天 可 再 改' : '每 日 可 修 改 一 次')
      .toggleClass('disabled', avatarLockedToday);

    // 5 个字段
    Object.keys(FIELDS).forEach(renderRow);
  }

  function renderRow(field) {
    const f = FIELDS[field];
    const $row = $(`.pf-row[data-field="${field}"]`);
    const $val = $(`#${f.valId}`);
    const $side = $(`#${f.sideId}`);

    const disp = displayValue(field);
    if (disp) {
      $val.text(disp).removeClass('pf-empty').addClass('pf-filled');
    } else {
      // 默认空态
      $val.removeClass('pf-filled').addClass('pf-empty')
          .text(field === 'nickname' ? user.name : '未 填 写');
      if (field === 'nickname') $val.removeClass('pf-empty').addClass('pf-filled');
    }

    // 右侧：只保留 锁图标（once 已确认） / 箭头（可点）
    $side.empty();
    if (f.policy === 'daily') {
      const lockedToday = profile[field + 'UpdatedAt'] === todayStr();
      $side.append(
        lockedToday
          ? '<span class="pf-arrow" style="opacity:.4">›</span>'
          : '<span class="pf-arrow">›</span>'
      );
      $row.removeClass('locked');
    } else {
      const locked = !!profile[field + 'Confirmed'];
      if (locked) {
        $side.append(`
          <span class="pf-lock" title="已确认，无法修改">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="1.5"/>
              <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
            </svg>
          </span>
        `);
        $row.addClass('locked');
      } else {
        $side.append('<span class="pf-arrow">›</span>');
        $row.removeClass('locked');
      }
    }
  }

  renderAll();

  // ===== 头像点击：今日可改时弹文件选择 =====
  $('#avatarBox').on('click', function () {
    if (profile.avatarUpdatedAt === todayStr()) {
      App.toast('头像今日已修改，请明日再来');
      return;
    }
    $('#avatarInput').val('').trigger('click');
  });
  $('#avatarInput').on('change', function () {
    const file = this.files && this.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { App.toast('请选择图片文件'); return; }
    if (file.size > 5 * 1024 * 1024) { App.toast('图片不能超过 5MB'); return; }
    const reader = new FileReader();
    reader.onload = function (e) {
      profile.avatar = e.target.result;
      profile.avatarUpdatedAt = todayStr();
      saveProfile();
      renderAll();
      App.toast('头像修改成功');
    };
    reader.readAsDataURL(file);
    this.value = '';
  });

  // ===== 字段行点击 → 打开 sheet =====
  $('.pf-row').on('click', function () {
    const field = $(this).data('field');
    const f = FIELDS[field];
    if (!f) return;
    if (isLocked(field)) {
      if (f.policy === 'once') {
        App.toast(`${f.label.replace(/\s/g, '')}已确认，无法修改`);
      } else {
        App.toast(`${f.label.replace(/\s/g, '')}今日已修改，请明日再来`);
      }
      return;
    }
    openEdit(field);
  });

  // ===== 编辑 sheet：动态渲染不同输入控件 =====
  let pendingField = null;

  function openEdit(field) {
    pendingField = field;
    const f = FIELDS[field];
    $('#editTitle').text(`${f.policy === 'once' ? '填 写' : '修 改'} ${f.label}`);
    $('#editWarn').toggleClass('hidden', f.policy !== 'once');

    const $body = $('#editBody').empty();
    const cur = profile[field] || '';

    if (field === 'nickname') {
      $body.html(`
        <input type="text" class="ef-input" id="efInput" maxlength="12" placeholder="请输入昵称（1 - 12 字）" value="${escapeAttr(cur)}">
        <div class="ef-hint">支持中英文 / 数字，最多 12 字</div>
      `);
    } else if (field === 'realname') {
      $body.html(`
        <input type="text" class="ef-input" id="efInput" maxlength="20" placeholder="请输入真实姓名" value="${escapeAttr(cur)}">
        <div class="ef-hint">请填写身份证上的真实姓名，确认后无法修改</div>
      `);
    } else if (field === 'gender') {
      $body.html(`
        <div class="ef-radios">
          <button type="button" class="ef-radio${cur === 'M' ? ' active' : ''}" data-val="M">男</button>
          <button type="button" class="ef-radio${cur === 'F' ? ' active' : ''}" data-val="F">女</button>
        </div>
      `);
    } else if (field === 'birthday') {
      // max=today，min=1900-01-01；移动端会弹原生日期选择器
      $body.html(`
        <input type="date" class="ef-date" id="efInput" min="1900-01-01" max="${todayStr()}" value="${escapeAttr(cur)}">
        <div class="ef-hint">出生日期一旦确认，无法修改</div>
      `);
    } else if (field === 'phone') {
      $body.html(`
        <input type="tel" class="ef-input" id="efInput" maxlength="11" inputmode="numeric" placeholder="请输入 11 位手机号" value="${escapeAttr(cur)}">
        <div class="ef-hint">请输入您本人实名手机号，确认后无法修改</div>
      `);
    } else if (field === 'email') {
      $body.html(`
        <input type="email" class="ef-input" id="efInput" placeholder="example@email.com" value="${escapeAttr(cur)}">
        <div class="ef-hint">用于接收平台通知，确认后无法修改</div>
      `);
    }

    $('#editMask, #editSheet').addClass('show');
    setTimeout(() => $('#efInput').trigger('focus'), 320);
  }

  function closeEdit() {
    $('#editMask, #editSheet').removeClass('show');
    pendingField = null;
  }

  // 性别按钮：单选
  $('#editBody').on('click', '.ef-radio', function () {
    $('.ef-radio').removeClass('active');
    $(this).addClass('active');
  });

  // 取消 / 遮罩关闭
  $('#editCancel, #editMask').on('click', closeEdit);

  // 确定按钮：校验 + 写入
  $('#editConfirm').on('click', function () {
    const field = pendingField;
    if (!field) return;
    const f = FIELDS[field];
    let val;

    if (field === 'gender') {
      val = $('.ef-radio.active').data('val');
      if (!val) { App.toast('请选择性别'); return; }
    } else {
      val = String($('#efInput').val() || '').trim();
    }

    // 校验
    if (!val) { App.toast(`请输入${f.label.replace(/\s/g, '')}`); return; }
    if (field === 'nickname') {
      if (val.length > 12) { App.toast('昵称最多 12 字'); return; }
    }
    if (field === 'realname') {
      if (val.length < 2 || val.length > 20) { App.toast('请输入 2 - 20 字的真实姓名'); return; }
      if (/^\d+$/.test(val)) { App.toast('真实姓名不能为纯数字'); return; }
    }
    if (field === 'phone') {
      if (!/^1\d{10}$/.test(val)) { App.toast('请输入正确的 11 位手机号'); return; }
    }
    if (field === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { App.toast('请输入正确的邮箱格式'); return; }
    }
    if (field === 'birthday') {
      if (val > todayStr()) { App.toast('出生日期不能晚于今日'); return; }
    }

    // 公共保存逻辑
    function commit() {
      if (f.policy === 'once') {
        profile[field] = val;
        profile[field + 'Confirmed'] = true;
      } else {
        profile[field] = val;
        profile[field + 'UpdatedAt'] = todayStr();
      }
      saveProfile();
      renderRow(field);
      closeEdit();
      App.toast(`${f.label.replace(/\s/g, '')}保存成功`);
    }

    // once 字段：二次确认（自定义黑金弹窗）
    if (f.policy === 'once') {
      const human = field === 'gender' ? (val === 'M' ? '男' : '女') : val;
      App.confirm({
        title: '一 旦 确 认 ， 将 无 法 修 改',
        message: `${f.label.replace(/\s/g, '')}： <em>${human}</em>\n\n是 否 提 交 ？`,
        okText: '确 认 提 交',
        cancelText: '再 想 想',
        danger: true,
        icon: 'warn'
      }).then(ok => { if (ok) commit(); });
    } else {
      commit();
    }
  });

  // ===== 返回按钮 =====
  $('#backBtn').on('click', function () {
    if (history.length > 1) history.back();
    else App.go(roomNo
      ? `../settings/settings.html?roomNo=${roomNo}`
      : `../settings/settings.html`);
  });

  // ===== 底部"联系客服" → 直接跳客服聊天页 =====
  $('#csLink').on('click', function () {
    App.go(roomNo
      ? `../cs/cs.html?roomNo=${roomNo}`
      : `../cs/cs.html`);
  });

  // 工具：转义 HTML 属性
  function escapeAttr(s) {
    return String(s).replace(/[<>&"']/g, c => ({
      '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

});
