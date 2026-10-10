import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileAssetEntity } from './entities/file-asset.entity';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([FileAssetEntity]), AuthModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService, TypeOrmModule],
})
export class FilesModule {}
