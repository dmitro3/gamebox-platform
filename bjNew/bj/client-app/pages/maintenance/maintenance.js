/**
 * 系统维护中（带倒计时）
 *
 * URL 参数：
 *   ?endAt=2026-05-29T23:30:00    维护结束时间（ISO 字符串）
 *   ?reason=自定义副文
 *
 * 默认结束时间：当前时间 + 30 分钟
 * 倒计时为 0 时自动 reload 回大厅
 */
$(function () {

  const params = new URLSearchParams(location.search);
  const reason = params.get('reason');
  const endAtStr = params.get('endAt');

  if (reason) $('#spSub').text(reason);

  // 计算 endAt 时间戳
  let endAt;
  if (endAtStr) {
    const t = new Date(endAtStr).getTime();
    endAt = isNaN(t) ? Date.now() + 30 * 60 * 1000 : t;
  } else {
    endAt = Date.now() + 30 * 60 * 1000;
  }
  // 显示预计结束时间（HH:MM）
  const endDate = new Date(endAt);
  $('#spEndAt').text(
    String(endDate.getHours()).padStart(2, '0') + ':' +
    String(endDate.getMinutes()).padStart(2, '0')
  );

  // 启动倒计时
  let timer;
  function tick() {
    const remain = Math.max(0, endAt - Date.now());
    const totalSec = Math.floor(remain / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    $('#cdH').text(String(h).padStart(2, '0'));
    $('#cdM').text(String(m).padStart(2, '0'));
    $('#cdS').text(String(s).padStart(2, '0'));
    if (remain <= 0) {
      clearInterval(timer);
      // 倒计时到 0：自动跳回大厅
      setTimeout(function () {
        App.toast('维 护 已 结 束 ， 正 在 重 新 进 入');
        setTimeout(() => App.go('../game-lobby/game-lobby.html'), 700);
      }, 600);
    }
  }
  tick();
  timer = setInterval(tick, 1000);

  // 刷新重试 → 直接 reload
  $('#retryBtn').on('click', function () {
    location.reload();
  });

  // 联系客服 → 跳 cs 页（如果未登录，cs 自己会引导）
  $('#csBtn').on('click', function () {
    App.go('../cs/cs.html');
  });

});
