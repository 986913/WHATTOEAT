import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async signin(username: string, password: string) {
    const foundUser = await this.userService.findByUserName(username);
    if (!foundUser) {
      throw new UnauthorizedException('No such user found');
    }
    if (foundUser.password !== password) {
      throw new UnauthorizedException('Invalid password');
    }

    return foundUser;
  }

  async signup(username: string, password: string) {
    const newUser = await this.userService.create({ username, password });
    return newUser;
  }
}
