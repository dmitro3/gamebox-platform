/**
 * TableGateway — Socket.IO WebSocket 网关
 *
 * 鉴权：客户端在 handshake.auth.token 中携带 JWT，
 *       连接时服务端校验并解出真实 userId，杜绝身份伪造。
 *       未带 token 可以旁观（接收快照），但不能下注。
 *
 * 事件：
 *   客户端 → 服务端：  table:join  table:bet
 *   服务端 → 客户端：  table:snapshot  table:betOk  table:error
 */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { TableService } from './table.service';
import type { TableBetPayload, TableSnapshot } from './table.types';
import type { JwtPayload } from '../auth/jwt.strategy';

@WebSocketGateway({
  namespace: '/table',
  cors: { origin: '*' },
})
export class TableGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private tableService: TableService,
    private jwt: JwtService,
  ) {}

  afterInit() {
    this.tableService.setBroadcast((gameCode: string, snap: TableSnapshot) => {
      this.server.to(`room:${gameCode}`).emit('table:snapshot', snap);
    });
  }

  /** 连接时校验 JWT，把真实 userId 存入 socket.data（伪造 token 会校验失败） */
  handleConnection(client: Socket) {
    const token: string | undefined = client.handshake.auth?.token;
    if (!token) return; // 旁观者
    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      client.data.userId = payload.sub;
    } catch {
      // token 无效 → 按旁观者处理，不断开（前端会在下注时收到提示）
    }
  }

  @SubscribeMessage('table:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameCode: string },
  ) {
    const { gameCode } = data;
    try {
      const snap = await this.tableService.snapshot(gameCode);
      client.join(`room:${gameCode}`);
      client.emit('table:snapshot', snap);
      return { joined: gameCode };
    } catch (err: unknown) {
      client.emit('table:error', { message: (err as Error).message });
      return { joined: null };
    }
  }

  @SubscribeMessage('table:bet')
  async handleBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TableBetPayload,
  ) {
    const playerId: string | undefined = client.data.userId;
    if (!playerId) {
      client.emit('table:error', { message: '请先登录' });
      return;
    }
    try {
      const result = await this.tableService.placeBet(playerId, payload);
      client.emit('table:betOk', result);
    } catch (err: unknown) {
      client.emit('table:error', { message: (err as Error).message });
    }
  }
}
