import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class SignUpDto {
  @ApiProperty({ description: 'The user name that will displayed on system' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'The user email that will used for login' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'The user password' })
  @IsString()
  @MinLength(6)
  @Matches(/^(?=.*[0-9])/, {
    message: 'Password must contain at least one number',
  })
  password: string;
}
