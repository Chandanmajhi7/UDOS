import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class PrimaryCampusDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  legalName!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsOptional()
  @IsIn(['IN'])
  countryCode?: string;

  @IsOptional()
  @IsIn(['INR'])
  currency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @ValidateNested()
  @Type(() => PrimaryCampusDto)
  primaryCampus!: PrimaryCampusDto;
}
