/**
 * 代理登录页
 * 交互：代理账号 + 代理密码 → 进入代理控制台
 *      左上角返回按钮：回上一页 / 或回玩家登录
 *      右上角汉堡菜单：返回玩家登录 / 房主登录 / 关于
 *      记住密码：勾选后把账号 + 密码写入 localStorage（key: gamebox_remember_proxy）
 *
 * 登录成功 → ../proxy-console/proxy-console.html
 * 测试账号：1 / 1（见 common.js ensureStaffAccounts）
 */

// "记住密码" 存储 key：代理登录独立 key，与玩家/房主登录互不干扰
const REMEMBER_KEY = 'gamebox_remember_proxy';

$(function () {

  // 左上角返回按钮（回上一页 / 或回玩家登录）
  $('#backBtn').on('click', function () {
    if (history.length > 1) {
      history.back();
    } else {
      App.go('../welcome/welcome.html');
    }
  });

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
    if (action === 'back-player') {
      App.go('../welcome/welcome.html');
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

  // 登录
  $('#btnLogin').on('click', async function () {
    const acc = $('#account').val().trim();
    const pwd = $('#password').val().trim();
    if (!acc) { App.toast('请输入代理账号'); return; }
    if (!pwd) { App.toast('请输入代理密码'); return; }

    const $btn = $(this).prop('disabled', true);
    $btn.find('.btn-text').text('登录中...');
    await App.delay(800);
    $btn.find('.btn-text').text('登 录');
    $btn.prop('disabled', false);

    // 登录成功：根据"记住密码"勾选状态写入 / 清除 localStorage
    try {
      if ($('#rememberMe').is(':checked')) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ acc, pwd }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch (_) { /* localStorage 不可用时静默忽略 */ }

    const user = App.verifyStaffAccount('proxy', acc, pwd);
    if (!user) {
      App.toast('账号或密码错误');
      return;
    }

    App.setStaffSession('proxy', user);
    App.toast(`欢迎，${user.name || user.account}`);
    setTimeout(() => App.go('../proxy-console/proxy-console.html'), 600);
  });

});
