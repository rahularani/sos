import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { LoginDto } from './dto/login.dto';
import {
  CitizenRegisterDto,
  VerifyOtpDto,
  ResendOtpDto,
  CitizenLoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  GoogleAuthDto,
} from './dto/user-auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  // ---------------------------------------------------------------------------
  // Helper: Generate secure 6-digit numeric OTP
  // ---------------------------------------------------------------------------
  private generateSixDigitOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ---------------------------------------------------------------------------
  // ADMIN AUTHENTICATION
  // ---------------------------------------------------------------------------
  async validateAdmin(email: string, pass: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!admin) return null;
    const isMatch = await bcrypt.compare(pass, admin.password);
    if (!isMatch) return null;
    const { password, ...result } = admin;
    return result;
  }

  async login(loginDto: LoginDto) {
    const admin = await this.validateAdmin(loginDto.email, loginDto.password);
    if (!admin) {
      this.logger.warn(`Failed login attempt for email: ${loginDto.email}`);
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload = {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };

    const accessToken = this.jwtService.sign(payload);
    return {
      statusCode: 200,
      message: 'Authentication successful.',
      accessToken,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // CITIZEN: Register with Email & Password (Dispatches Brevo OTP)
  // ---------------------------------------------------------------------------
  async registerCitizen(dto: CitizenRegisterDto) {
    const email = dto.email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.isVerified) {
      throw new ConflictException('An account with this email already exists. Please sign in.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    let user;
    if (existingUser && !existingUser.isVerified) {
      // Update unverified user credentials
      user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          fullName: dto.fullName.trim(),
          phoneNumber: dto.phoneNumber?.trim() || null,
        },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName: dto.fullName.trim(),
          phoneNumber: dto.phoneNumber?.trim() || null,
          isVerified: false,
        },
      });
    }

    // Generate and store OTP
    const otp = this.generateSixDigitOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate prior active sign-up OTPs for this email
    await this.prisma.verificationOtp.updateMany({
      where: { email, purpose: 'SIGNUP', consumed: false },
      data: { consumed: true },
    });

    await this.prisma.verificationOtp.create({
      data: {
        email,
        userId: user.id,
        otp,
        purpose: 'SIGNUP',
        expiresAt,
      },
    });

    // Send via Brevo
    await this.emailService.sendOtpEmail(email, otp, 'SIGNUP');

    return {
      statusCode: 201,
      message: 'Verification code sent to your email. Please enter the 6-digit OTP.',
      email,
    };
  }

  // ---------------------------------------------------------------------------
  // CITIZEN: Verify OTP (Activates Account & Issues JWT)
  // ---------------------------------------------------------------------------
  async verifyOtp(dto: VerifyOtpDto) {
    const email = dto.email.toLowerCase().trim();
    const purpose = dto.purpose || 'SIGNUP';

    const otpRecord = await this.prisma.verificationOtp.findFirst({
      where: {
        email,
        otp: dto.otp.trim(),
        purpose: purpose as any,
        consumed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    // Mark OTP consumed
    await this.prisma.verificationOtp.update({
      where: { id: otpRecord.id },
      data: { consumed: true },
    });

    if (purpose === 'SIGNUP') {
      const user = await this.prisma.user.update({
        where: { email },
        data: { isVerified: true },
      });

      const accessToken = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        name: user.fullName,
        role: 'CITIZEN',
      });

      return {
        statusCode: 200,
        message: 'Account verified successfully.',
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
        },
      };
    }

    return {
      statusCode: 200,
      message: 'OTP verified successfully.',
      email,
      verified: true,
    };
  }

  // ---------------------------------------------------------------------------
  // CITIZEN: Resend OTP
  // ---------------------------------------------------------------------------
  async resendOtp(dto: ResendOtpDto) {
    const email = dto.email.toLowerCase().trim();
    const purpose = dto.purpose || 'SIGNUP';

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('Account not found with this email.');
    }

    const otp = this.generateSixDigitOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.verificationOtp.updateMany({
      where: { email, purpose: purpose as any, consumed: false },
      data: { consumed: true },
    });

    await this.prisma.verificationOtp.create({
      data: {
        email,
        userId: user.id,
        otp,
        purpose: purpose as any,
        expiresAt,
      },
    });

    await this.emailService.sendOtpEmail(email, otp, purpose as any);

    return {
      statusCode: 200,
      message: 'A new 6-digit verification code has been dispatched to your email.',
    };
  }

  // ---------------------------------------------------------------------------
  // CITIZEN: Login with Email & Password
  // ---------------------------------------------------------------------------
  async loginCitizen(dto: CitizenLoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.isVerified) {
      // Resend OTP automatically if not yet verified
      const otp = this.generateSixDigitOtp();
      await this.prisma.verificationOtp.create({
        data: {
          email,
          userId: user.id,
          otp,
          purpose: 'SIGNUP',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      await this.emailService.sendOtpEmail(email, otp, 'SIGNUP');

      throw new UnauthorizedException({
        statusCode: 401,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Account not yet verified. A fresh OTP has been sent to your email.',
        email,
      });
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      name: user.fullName,
      role: 'CITIZEN',
    });

    return {
      statusCode: 200,
      message: 'Signed in successfully.',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // CITIZEN: Forgot Password Request (Sends Brevo OTP)
  // ---------------------------------------------------------------------------
  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Return success anyway to avoid user enumeration
      return {
        statusCode: 200,
        message: 'If an account exists with this email, a reset code has been sent.',
      };
    }

    const otp = this.generateSixDigitOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.verificationOtp.updateMany({
      where: { email, purpose: 'FORGOT_PASSWORD', consumed: false },
      data: { consumed: true },
    });

    await this.prisma.verificationOtp.create({
      data: {
        email,
        userId: user.id,
        otp,
        purpose: 'FORGOT_PASSWORD',
        expiresAt,
      },
    });

    await this.emailService.sendOtpEmail(email, otp, 'FORGOT_PASSWORD');

    return {
      statusCode: 200,
      message: 'Password reset code dispatched to your email.',
      email,
    };
  }

  // ---------------------------------------------------------------------------
  // CITIZEN: Reset Password with OTP
  // ---------------------------------------------------------------------------
  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.toLowerCase().trim();

    const otpRecord = await this.prisma.verificationOtp.findFirst({
      where: {
        email,
        otp: dto.otp.trim(),
        purpose: 'FORGOT_PASSWORD',
        consumed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired reset code.');
    }

    // Mark OTP consumed
    await this.prisma.verificationOtp.update({
      where: { id: otpRecord.id },
      data: { consumed: true },
    });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.newPassword, salt);

    const user = await this.prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        isVerified: true,
      },
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      name: user.fullName,
      role: 'CITIZEN',
    });

    return {
      statusCode: 200,
      message: 'Password updated successfully.',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // CITIZEN: Google OAuth 2.0 Sign-In / Sign-Up
  // ---------------------------------------------------------------------------
  async googleAuth(dto: GoogleAuthDto) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new BadRequestException('Google token does not contain a valid email.');
      }

      const email = payload.email.toLowerCase().trim();
      const googleId = payload.sub;
      const fullName = payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || 'Citizen';
      const avatarUrl = payload.picture;

      // Find or create user
      let user = await this.prisma.user.findFirst({
        where: {
          OR: [{ googleId }, { email }],
        },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email,
            googleId,
            fullName,
            avatarUrl,
            isVerified: true, // Auto-verified by Google
          },
        });
      } else {
        // Link Google ID if not yet linked
        if (!user.googleId) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              googleId,
              avatarUrl: user.avatarUrl || avatarUrl,
              isVerified: true,
            },
          });
        }
      }

      const accessToken = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        name: user.fullName,
        role: 'CITIZEN',
      });

      return {
        statusCode: 200,
        message: 'Google authentication successful.',
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          avatarUrl: user.avatarUrl,
        },
      };
    } catch (err) {
      this.logger.error(`Google authentication error: ${err.message}`, err.stack);
      throw new UnauthorizedException('Google authentication failed. Invalid token.');
    }
  }
}
