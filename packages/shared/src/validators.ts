/**
 * 纯函数校验 —— 从原型 common.js 迁移。
 * 仅用于前端即时提示；后端必须独立再校验一遍（安全）。
 */

/** 账号：8-20 位、英文+数字、且两者都要有。返回 null=通过 */
export function validateAccount(account: string): string | null {
  if (!account) return '请输入账号';
  if (account.length < 8) return '账号至少 8 位';
  if (account.length > 20) return '账号最多 20 位';
  if (!/^[A-Za-z0-9]+$/.test(account)) return '账号只能包含英文字母和数字';
  if (!/[A-Za-z]/.test(account)) return '账号必须包含英文字母';
  if (!/[0-9]/.test(account)) return '账号必须包含数字';
  return null;
}

/** 密码：6-30 位 */
export function validatePassword(password: string): string | null {
  if (!password) return '请输入密码';
  if (password.length < 6) return '密码至少 6 位';
  if (password.length > 30) return '密码最多 30 位';
  return null;
}

/** 金额：正整数（积分最小单位） */
export function validateAmount(amount: number): string | null {
  if (!Number.isFinite(amount)) return '金额无效';
  if (!Number.isInteger(amount)) return '金额必须为整数';
  if (amount <= 0) return '金额必须大于 0';
  return null;
}
