import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { TableService } from './table.service';

@Controller('table')
export class TableController {
  constructor(private tableService: TableService) {}

  /** GET /api/table/:gameCode/snapshot — 首屏 SSR 用，无需 WS */
  @Public()
  @Get(':gameCode/snapshot')
  snapshot(@Param('gameCode') gameCode: string) {
    return this.tableService.snapshot(gameCode);
  }
}
