/**
 * 房主登录后首页
 */
$(function () {
  const session = App.requireStaffSession('agent', '../agent-login/agent-login.html');
  if (!session) return;

  $('#staffName').text(session.name || session.account);
  $('#staffAccount').text(session.account);

  $('#backBtn').on('click', function () {
    App.go('../agent-login/agent-login.html');
  });

  $('.sc-item:not(.sc-item-muted)').on('click', function () {
    const href = $(this).data('href');
    if (href) App.go(href);
  });

  $('#btnLogout').on('click', function () {
    App.clearStaffSession('agent');
    App.toast('已退出');
    setTimeout(() => App.go('../agent-login/agent-login.html'), 400);
  });
});
