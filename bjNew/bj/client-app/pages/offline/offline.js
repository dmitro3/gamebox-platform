/**
 * 网络异常 / 离线页
 *
 * URL 参数：
 *   ?reason=自定义副文
 *   ?retryUrl=点"重新加载"要跳的目标地址（默认 reload）
 *
 * 监听 online 事件：网络一旦恢复就提示并自动 reload
 */
$(function () {

  const params = new URLSearchParams(location.search);
  const reason = params.get('reason');
  const retryUrl = params.get('retryUrl');

  if (reason) $('#spSub').text(reason);

  $('#retryBtn').on('click', function () {
    if (retryUrl) location.href = retryUrl;
    else location.reload();
  });

  $('#backBtn').on('click', function () {
    if (history.length > 1) history.back();
    else App.go('../game-lobby/game-lobby.html');
  });

  // 浏览器检测到网络恢复
  window.addEventListener('online', function () {
    App.toast('网 络 已 恢 复 · 自 动 刷 新');
    setTimeout(() => location.reload(), 700);
  });

});
