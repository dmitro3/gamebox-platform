/**
 * 启动 / 开场动画
 *
 * 流程：
 *   1) 进入页面 → 启动 1.2 秒动画（Logo 浮现 + 三字逐字渐入 + 进度条 0→100）
 *   2) 进度条满之后 → 提示"点击屏幕开始游戏"，等用户主动点击才跳转
 *      （不再自动跳，仪式感更强 + 避免用户没看到品牌就被强行带走）
 *   3) 跳转去向：
 *      - 若 localStorage 有有效登录态（未超时）→ 跳大厅
 *      - 否则 → 清登录态 + 跳 welcome
 *
 * 注意：splash 在 SESSION_EXEMPT 列表里，common.js 不会对它触发会话检查
 *        所以这里要自己判断 session 是否超时
 */
$(function () {

  const DURATION = 1200;       // 进度条满所需时长（与 .sp-bar transition 配合）
  let jumped = false;
  let ready  = false;          // 进度条未满前点击不响应

  setTimeout(function () {
    $('#spBar').css('width', '100%');
  }, 80);

  setTimeout(function () {
    ready = true;
    $('#spTip').text('点 击 屏 幕 开 始 游 戏');
    $('.sp-tip').addClass('ready');
    $('#spSkip').hide();
  }, DURATION);

  $('#splashPage').on('click touchstart', function () {
    if (!ready) return;
    jump();
  });

  function jump() {
    if (jumped) return;
    jumped = true;

    const user = App.getUser();
    if (user && user.uid && !App.isSessionExpired()) {
      App.touchSession();
      App.go('../game-lobby/game-lobby.html');
    } else {
      App.clearUser();
      App.clearSession();
      App.go('../welcome/welcome.html');
    }
  }

});
