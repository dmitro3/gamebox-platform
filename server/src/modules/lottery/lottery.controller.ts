import {
  Controller, Post, Get, Body, Param, Query,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { LotteryService } from './lottery.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

interface JwtUser { id: string; uid: string; role: string }

class LotteryBetDto {
  @IsString()
  @MaxLength(50)
  betType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  betValue?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  amount!: number;
}

@Controller('lottery')
export class LotteryController {
  constructor(private readonly lottery: LotteryService) {}

  /** 投注（需登录） */
  @Post(':gameCode/bet')
  async bet(
    @Param('gameCode') gameCode: string,
    @Body() dto: LotteryBetDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.lottery.placeBet(user.id, gameCode, dto.betType, dto.betValue, dto.amount);
  }

  /** 当前期（公开） */
  @Public()
  @Get(':gameCode/current')
  currentIssue(@Param('gameCode') gameCode: string) {
    return this.lottery.currentIssue(gameCode);
  }

  /** 历史开奖（公开） */
  @Public()
  @Get(':gameCode/history')
  history(
    @Param('gameCode') gameCode: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.lottery.history(gameCode, Math.min(limit, 50));
  }

  /** 我的投注记录 */
  @Get(':gameCode/my-bets')
  myBets(
    @Param('gameCode') gameCode: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.lottery.myBets(user.id, gameCode, page, pageSize);
  }
}
