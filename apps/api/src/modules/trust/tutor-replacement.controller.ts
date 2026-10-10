import { Controller, Get, Post, Patch, Param, Body, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { TutorReplacementService } from './tutor-replacement.service';
import { CreateReplacementCaseDto, UpdateReplacementCaseDto } from './dto';

@ApiTags('Trust & Tutor Replacement Guarantee')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/tutor-replacements')
export class TutorReplacementController {
  constructor(
    @Inject(TutorReplacementService)
    private readonly replacementService: TutorReplacementService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Submit a tutor replacement guarantee request (FR-011)' })
  @ApiResponse({ status: 201, description: 'Replacement request created' })
  async requestReplacement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReplacementCaseDto,
  ) {
    return this.replacementService.requestReplacement(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List replacement cases (Admin queue or requester history)' })
  @ApiResponse({ status: 200, description: 'List of replacement cases' })
  async listCases(@CurrentUser() user: AuthenticatedUser) {
    return this.replacementService.listCases(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get replacement case details (ABAC Scoped)' })
  @ApiResponse({ status: 200, description: 'Replacement case details' })
  async getCase(@CurrentUser() user: AuthenticatedUser, @Param('id') caseId: string) {
    return this.replacementService.getCase(user, caseId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update replacement case status & assignment (Admin only)' })
  @ApiResponse({ status: 200, description: 'Replacement case updated' })
  async updateCaseStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') caseId: string,
    @Body() dto: UpdateReplacementCaseDto,
  ) {
    return this.replacementService.updateCaseStatus(user, caseId, dto);
  }
}
