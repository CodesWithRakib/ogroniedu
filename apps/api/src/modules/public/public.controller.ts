import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { ok } from '../../common/api-response/api-response';

@ApiTags('Public')
@Controller('api/v1/public')
export class PublicController {
  constructor(
    @Inject(PublicService)
    private readonly publicService: PublicService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform aggregates for the public site (no PII)' })
  @ApiResponse({ status: 200, description: 'Live tutor/student/session/rating counts' })
  async getStats() {
    const stats = await this.publicService.getPlatformStats();
    return ok(stats);
  }
}
