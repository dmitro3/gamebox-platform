/**
 * 代理登录后首页
 */
$(function () {
  const session = App.requireStaffSession('proxy', '../proxy-login/proxy-login.html');
  if (!session) return;

  $('#staffName').text(session.name || session.account);
  $('#staffAccount').text(session.account);

  $('#backBtn').on('click', function () {
    App.go('../proxy-login/proxy-login.html');
  });

  $('.sc-item:not(.sc-item-muted)').on('click', function () {
    const href = $(this).data('href');
    if (href) App.go(href);
  });

  $('#btnLogout').on('click', function () {
    App.clearStaffSession('proxy');
    App.toast('已退出');
    setTimeout(() => App.go('../proxy-login/proxy-login.html'), 400);
  });
});
