import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { validateAccount, validatePassword } from '@gamebox/shared';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** 生成 9 位唯一 UID */
  private async genUid(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const uid = String(Math.floor(100000000 + Math.random() * 900000000));
      const exists = await this.prisma.user.findUnique({ where: { uid } });
      if (!exists) return uid;
    }
    throw new Error('UID 生成失败，请重试');
  }

  /** 生成推广码（6 位大写字母数字） */
  private async genPromoCode(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const exists = await this.prisma.user.findUnique({ where: { promoCode: code } });
      if (!exists) return code;
    }
    throw new Error('推广码生成失败，请重试');
  }

  async create(dto: {
    username: string;
    password: string;
    nickname?: string;
    inviteCode?: string; // 邀请码（上级推广码）
  }) {
    const username = dto.username.toLowerCase();

    // 校验（后端权威校验，shared 里的规则）
    const accErr = validateAccount(username);
    if (accErr) throw new ConflictException(accErr);
    const pwdErr = validatePassword(dto.password);
    if (pwdErr) throw new ConflictException(pwdErr);

    if (await this.prisma.user.findUnique({ where: { username } })) {
      throw new ConflictException('账号已存在');
    }

    // 找上级
    let parent: { id: string; agentPath: string; depth: number } | null = null;
    if (dto.inviteCode) {
      parent = await this.prisma.user.findUnique({
        where: { promoCode: dto.inviteCode },
        select: { id: true, agentPath: true, depth: true },
      });
      // 邀请码不存在也允许注册（只是没有上级）
    }

    const uid = await this.genUid();
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const agentPath = parent ? `${parent.agentPath}${parent.id}/` : '/';

    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash,
        uid,
        nickname: dto.nickname ?? `玩家${uid.slice(-4)}`,
        role: 'PLAYER',
        parentId: parent?.id ?? null,
        agentPath,
        depth: parent ? parent.depth + 1 : 0,
      },
    });

    return this.toProfile(user);
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  }

  async findById(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('用户不存在');
    return u;
  }

  async getProfile(id: string) {
    const u = await this.findById(id);
    return this.toProfile(u);
  }

  async changePassword(id: string, oldPwd: string, newPwd: string) {
    const u = await this.findById(id);
    if (!(await bcrypt.compare(oldPwd, u.passwordHash))) {
      throw new ConflictException('当前密码不正确');
    }
    const pwdErr = validatePassword(newPwd);
    if (pwdErr) throw new ConflictException(pwdErr);
    if (oldPwd === newPwd) throw new ConflictException('新密码不能与当前密码相同');
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(newPwd, SALT_ROUNDS) },
    });
    return { ok: true };
  }

  /** 只返回安全的字段（不含 passwordHash） */
  toProfile(u: {
    id: string; uid: string; username: string; nickname: string;
    avatar: string | null; role: string; status: string;
    promoCode: string | null; createdAt: Date;
  }) {
    return {
      id: u.id,
      uid: u.uid,
      username: u.username,
      nickname: u.nickname,
      avatar: u.avatar,
      role: u.role,
      status: u.status,
      promoCode: u.promoCode,
      createdAt: u.createdAt,
    };
  }
}
