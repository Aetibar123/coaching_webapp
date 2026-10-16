import { ArrayNotEmpty, IsArray } from 'class-validator';

export class AssignBatchDto {
  @IsArray()
  @ArrayNotEmpty()
  batch_ids!: (string | number)[];
}

