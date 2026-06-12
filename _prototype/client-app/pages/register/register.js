/**
 * 注册页
 * 校验规则：
 *   - 账号：英文 + 数字组成，至少 8 位（两者都必须有），且不能和已注册账号重复
 *   - 密码：至少 6 位，无其他限制；两次输入必须一致
 * 注册成功后：随机分配头像/昵称/9位ID，写入账号表，跳回登录页
 */
$(function () {

  $('#btnRegister').on('click', async function () {
    const acc = $('#account').val().trim();
    const p1 = $('#password').val();
    const p2 = $('#password2').val();

    const accErr = App.validateAccount(acc);
    if (accErr) { App.toast(accErr); return; }
    if (App.accountExists(acc)) { App.toast('该账号已被注册'); return; }
    if (!p1) { App.toast('请输入密码'); return; }
    if (p1.length < 6) { App.toast('密码至少 6 位'); return; }
    if (p1 !== p2) { App.toast('两次密码不一致'); return; }

    const $btn = $(this).prop('disabled', true);
    $btn.find('.btn-text').text('提交中...');
    await App.delay(800);

    const newUser = App.registerAccount(acc, p1);
    App.setUser(newUser);
    App.touchSession();                  // 启动新会话

    $btn.find('.btn-text').text('立 即 注 册');
    $btn.prop('disabled', false);
    App.toast(`注册成功，欢迎 ${newUser.name}`);
    setTimeout(() => App.go('../welcome/welcome.html'), 1000);
  });

});
