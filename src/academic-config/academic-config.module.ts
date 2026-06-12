import { Module } from '@nestjs/common';
import { AcademicConfigService } from './academic-config.service';
import { AcademicConfigController } from './academic-config.controller';

@Module({
  controllers: [AcademicConfigController],
  providers: [AcademicConfigService],
})
export class AcademicConfigModule {}
