import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { SignUpDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ObjectId } from 'mongodb';
import { IUser } from './interfaces/user.interface';
import { RefreshToken } from './schemas/refresh-token.schema';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private UserModel: Model<User>,
    @InjectModel(RefreshToken.name)
    private RefreshTokenModel: Model<RefreshToken>,
    private JwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { email, password, name } = signUpDto;

    // check if email is in use
    const emailInUse = await this.UserModel.findOne({
      email: email,
    });

    if (emailInUse) {
      throw new BadRequestException('Email already in use');
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    await this.UserModel.create({
      name,
      email,
      password: hashedPassword,
    });

    return {
      msg: 'oke',
    };
  }

  async login(credentials: LoginDto) {
    const { email, password } = credentials;

    // find if user exists by email
    const user = (await this.UserModel.findOne({
      email: email,
    })) as IUser | null;

    if (!user) {
      throw new UnauthorizedException('Wrong credentials');
    }

    // compare entered password with existing password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Wrong credentials');
    }

    // generate jwt token
    const tokens = await this.generateUserTokens(user._id);
    return {
      ...tokens,
      userId: user._id,
    };
  }

  async generateUserTokens(userId: ObjectId) {
    const accessToken = this.JwtService.sign({ userId }, { expiresIn: '1h' });
    const refreshToken = uuidv4();

    await this.storeRefreshToken(refreshToken, userId);

    return {
      accessToken,
      refreshToken,
    };
  }

  async storeRefreshToken(token: string, userId: ObjectId) {
    // calculate expiry date 3 days from now
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3);

    await this.RefreshTokenModel.updateOne(
      { userId },
      { $set: { expiryDate, token } },
      {
        upsert: true,
      },
    );
  }

  async refreshTokens(refreshToken: string) {
    // check if refreshToken is expired
    const token = await this.RefreshTokenModel.findOne({
      token: refreshToken,
      expiryDate: { $gte: new Date() },
    });

    if (!token) {
      throw new UnauthorizedException('Refresh Token is invalid');
    }

    return this.generateUserTokens(token.userId);
  }

  async changePassword(
    userId: ObjectId,
    oldPassword: string,
    newPassword: string,
  ) {
    // find the user
    const user = await this.UserModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found...');
    }

    // compare the old password with the password in DB
    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Wrong credentials');
    }

    // change user's password
    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = newHashedPassword;
    user.save();

    return {
      msg: 'Password successfuly changed.',
    };
  }

  async forgetPassword(email: string) {
    const user = await this.UserModel.findOne({ email });
    if (user) {
    }

    return {
      message: 'If this user exists, they will receive an email',
    };
  }
}
