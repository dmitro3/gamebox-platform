/**
 * 审核列表（房主端）
 */
$(function () {
  const session = App.requireStaffSession('agent', '../agent-login/agent-login.html');
  if (!session) return;

  $('#backBtn').on('click', function () {
    App.go('../agent-console/agent-console.html');
  });
});
