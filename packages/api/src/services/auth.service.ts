import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserDto } from '../dtos/user.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(user: { id: string | null }, response: any): Promise<UserDto> {
    const payload = { id: user.id };
    const token = this.jwtService.sign(payload);

    response.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return new UserDto(payload.id);
  }
}
