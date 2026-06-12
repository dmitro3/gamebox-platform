/**
 * TableGateway — Socket.IO WebSocket 网关
 *
 * 事件：
 *   客户端 → 服务端：  table:join  table:bet
 *   服务端 → 客户端：  table:snapshot  table:error
 */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { TableService } from './table.service';
import type { TableBetPayload, TableSnapshot } from './table.types';

@WebSocketGateway({
  namespace: '/table',
  cors: { origin: '*' },
})
export class TableGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(private tableService: TableService) {}

  afterInit() {
    // 注册广播回调：TableService 在状态机每 tick 后调用此函数
    this.tableService.setBroadcast((gameCode: string, snap: TableSnapshot) => {
      this.server.to(`room:${gameCode}`).emit('table:snapshot', snap);
    });
  }

  /** 加入房间，立刻推送当前快照 */
  @SubscribeMessage('table:join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameCode: string },
  ) {
    const { gameCode } = data;
    client.join(`room:${gameCode}`);
    const snap = this.tableService.snapshot(gameCode);
    client.emit('table:snapshot', snap);
    return { joined: gameCode };
  }

  /** 玩家下注（需要 token，通过 handshake auth 传入） */
  @SubscribeMessage('table:bet')
  async handleBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TableBetPayload,
  ) {
    const playerId: string = client.handshake.auth?.userId;
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
