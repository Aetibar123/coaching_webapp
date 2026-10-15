import { PartialType } from '@nestjs/mapped-types';
import { CreateBatchDto } from './CreateBatch.dto';

export class UpdateBatchDto extends PartialType(CreateBatchDto) {}
