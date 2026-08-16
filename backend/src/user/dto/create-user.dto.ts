import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({
    message: 'El nombre es obligatorio.',
  })
  @IsString()
  name!: string;

  @IsEmail(
    {},
    {
      message: 'Debe ingresar un correo válido.',
    },
  )
  email!: string;

  @IsString()
  @MinLength(6, {
    message: 'La contraseña debe tener al menos 6 caracteres.',
  })
  password!: string;
}