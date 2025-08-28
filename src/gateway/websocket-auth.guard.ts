import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class WebSocketAuthGuard implements CanActivate {
  private readonly logger = new Logger(WebSocketAuthGuard.name);
  private readonly rateLimitMap = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private readonly MAX_MESSAGES_PER_MINUTE = 30;
  private readonly RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const clientIp = this.getClientIp(client);

    // Rate limiting check
    if (!this.checkRateLimit(clientIp)) {
      this.logger.warn(`Rate limit exceeded for IP: ${clientIp}`);
      client.emit('error', {
        message: 'Rate limit exceeded. Please slow down your requests.',
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return false;
    }

    // Basic connection validation
    if (!client.id) {
      this.logger.warn('WebSocket connection without valid client ID');
      return false;
    }

    return true;
  }

  private getClientIp(client: Socket): string {
    const forwarded = client.handshake.headers['x-forwarded-for'];
    const ip = forwarded
      ? Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0]
      : client.handshake.address;
    return ip || 'unknown';
  }

  private checkRateLimit(clientIp: string): boolean {
    const now = Date.now();
    const clientData = this.rateLimitMap.get(clientIp);

    if (!clientData || now > clientData.resetTime) {
      // Reset or initialize rate limit window
      this.rateLimitMap.set(clientIp, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW_MS,
      });
      return true;
    }

    if (clientData.count >= this.MAX_MESSAGES_PER_MINUTE) {
      return false;
    }

    clientData.count++;
    return true;
  }

  // Clean up old rate limit entries periodically
  cleanupRateLimitMap(): void {
    const now = Date.now();
    for (const [ip, data] of this.rateLimitMap.entries()) {
      if (now > data.resetTime) {
        this.rateLimitMap.delete(ip);
      }
    }
  }
}
