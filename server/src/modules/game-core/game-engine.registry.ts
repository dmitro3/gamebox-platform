import { Injectable, NotFoundException } from '@nestjs/common';
import type { GameCategory } from '@gamebox/shared';
import type { IGameEngine } from './types';

/**
 * 引擎注册表：各品类引擎启动时注册，业务层按 category 取用。
 * 这样新增一类游戏只需实现 IGameEngine 并 register，无需改调用方。
 */
@Injectable()
export class GameEngineRegistry {
  private readonly engines = new Map<GameCategory, IGameEngine>();

  register(engine: IGameEngine): void {
    this.engines.set(engine.category, engine);
  }

  get(category: GameCategory): IGameEngine {
    const engine = this.engines.get(category);
    if (!engine) throw new NotFoundException(`未注册的游戏品类引擎：${category}`);
    return engine;
  }
}
