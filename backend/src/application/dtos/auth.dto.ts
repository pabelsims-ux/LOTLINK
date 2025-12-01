import { IsString, IsOptional, IsEmail } from 'class-validator';

export class RegisterDto {
  @IsString()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class LoginDto {
  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  password?: string;
}

export class AuthResponseDto {
  user!: {
    id: string;
    phone: string;
    email?: string;
    name?: string;
  };
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
}
