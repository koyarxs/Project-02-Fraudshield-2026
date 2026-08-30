import { PartialType } from '@nestjs/mapped-types';
import { CreateUploadedFileDto } from './create-uploaded-file.dto';

export class UpdateUploadedFileDto extends PartialType(CreateUploadedFileDto) {}
