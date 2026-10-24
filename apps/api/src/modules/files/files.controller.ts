import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { FilesService } from './files.service';
import { UploadEvidenceFileDto } from '../tutors/dto/upload-evidence-file.dto';

@Controller('api/v1/files')
@UseGuards(AuthGuard)
export class FilesController {
  constructor(
    @Inject(FilesService)
    private readonly filesService: FilesService,
  ) {}

  @Post('upload-evidence')
  @HttpCode(HttpStatus.CREATED)
  async uploadEvidence(@CurrentUser() user: AuthenticatedUser, @Body() dto: UploadEvidenceFileDto) {
    const file = await this.filesService.uploadEvidence(user, dto);
    return {
      success: true,
      file: {
        id: file.id,
        storageKey: file.storageKey,
        originalFilename: file.originalFilename,
        mediaType: file.mediaType,
        sizeBytes: file.sizeBytes,
        purpose: file.purpose,
        visibility: file.visibility,
        createdAt: file.createdAt,
      },
    };
  }

  @Get(':fileId/access')
  async getFileAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    const file = await this.filesService.getFileAccess(fileId, user);
    return {
      success: true,
      file: {
        id: file.id,
        originalFilename: file.originalFilename,
        mediaType: file.mediaType,
        sizeBytes: file.sizeBytes,
        purpose: file.purpose,
        visibility: file.visibility,
        storageProvider: file.storageProvider,
        // Secure access granted
        accessGranted: true,
        signedAccessUrl: file.signedAccessUrl,
        signedAccessToken: file.signedAccessToken,
        expiresAt: file.expiresAt,
      },
    };
  }

  @Public()
  @Get(':fileId/download')
  async downloadFile(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Query('token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const { file } = await this.filesService.verifyDownloadAccess(fileId, token, user);
    return {
      success: true,
      fileId: file.id,
      originalFilename: file.originalFilename,
      mediaType: file.mediaType,
      sizeBytes: file.sizeBytes,
      storageKey: file.storageKey,
      storageProvider: file.storageProvider,
    };
  }
}
