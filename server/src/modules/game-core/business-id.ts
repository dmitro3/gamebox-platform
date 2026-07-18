import { randomBytes } from 'node:crypto';

/**
 * 展示用业务编号。数据库主键仍使用 cuid；这里避免 Date.now() 在同毫秒并发碰撞。
 */
export function businessNo(prefix: string): string {
  const time = Date.now().toString(36).toUpperCase();
  const entropy = randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}${time}${entropy}`;
}
