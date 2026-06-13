/**
 * 主登录页（玩家入口）
 * 交互：账号密码登录 / 跳注册 / 右上角菜单进房主登录
 *      记住密码：勾选后把账号 + 密码写入 localStorage（key: gamebox_remember_player）
 *               下次进入页面自动回填，未勾选时不写入并清除上次记录
 */

// "记住密码" 存储 key：玩家登录独立 key，与房主/代理登录互不干扰
const REMEMBER_KEY = 'gamebox_remember_player';

$(function () {

  // 右上角汉堡菜单展开/收起
  $('#menuBtn').on('click', function (e) {
    e.stopPropagation();
    $('#menuPopover').toggleClass('show');
  });
  $(document).on('click', function () {
    $('#menuPopover').removeClass('show');
  });
  $('#menuPopover').on('click', function (e) { e.stopPropagation(); });

  // 菜单项动作
  $('#menuPopover .menu-item').on('click', function () {
    const action = $(this).data('action');
    if (action === 'proxy-login') {
      App.go('../proxy-login/proxy-login.html');
    } else if (action === 'agent-login') {
      App.go('../agent-login/agent-login.html');
    } else if (action === 'about') {
      App.toast('关于：原型 v0.1');
    }
  });

  // 进入页面：尝试回填上次"记住密码"的账号/密码
  (function restoreRemember() {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && saved.acc) {
        $('#account').val(saved.acc);
        if (saved.pwd) $('#password').val(saved.pwd);
        $('#rememberMe').prop('checked', true);
      }
    } catch (_) { /* 容错：localStorage 解析失败时静默忽略 */ }
  })();

  // 登录：用注册时建立的账号表做校验（账号大小写不敏感）
  $('#btnLogin').on('click', async function () {
    const acc = $('#account').val().trim();
    const pwd = $('#password').val();
    if (!acc) { App.toast('请输入账号'); return; }
    if (!pwd) { App.toast('请输入密码'); return; }

    const $btn = $(this).prop('disabled', true);
    $btn.find('.btn-text').text('登录中...');
    await App.delay(700);

    const user = App.verifyAccount(acc, pwd);
    $btn.find('.btn-text').text('登 录');
    $btn.prop('disabled', false);

    if (!user) { App.toast('账号或密码错误'); return; }

    // 登录成功：根据"记住密码"勾选状态写入 / 清除 localStorage
    try {
      if ($('#rememberMe').is(':checked')) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ acc, pwd }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch (_) { /* localStorage 不可用时静默忽略 */ }

    App.setUser(user);
    App.touchSession();                  // 启动新会话
    App.toast(`欢迎 ${user.name}`);
    setTimeout(() => App.go('../referral-input/referral-input.html'), 700);
  });

  // 注册
  $('#btnRegister').on('click', function () {
    App.go('../register/register.html');
  });

});
