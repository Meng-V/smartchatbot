import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class DatabaseCleanupService {
  private readonly logger = new Logger(DatabaseCleanupService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Cleanup health-check messages every hour at :00 minutes
   * This prevents database pollution from health endpoint calls
   */
  @Cron('0 * * * *', {
    name: 'cleanup-health-checks',
    timeZone: 'America/New_York',
  })
  async cleanupHealthCheckMessages(): Promise<void> {
    try {
      this.logger.log('Starting scheduled health-check cleanup...');

      const messagesDeleted =
        await this.databaseService.cleanupHealthCheckMessages();
      const conversationsDeleted =
        await this.databaseService.cleanupOrphanedHealthCheckConversations();

      if (messagesDeleted > 0 || conversationsDeleted > 0) {
        this.logger.log(
          `Health-check cleanup completed: ${messagesDeleted} messages, ${conversationsDeleted} conversations deleted`,
        );
      } else {
        this.logger.debug(
          'Health-check cleanup completed: no records to clean',
        );
      }
    } catch (error) {
      this.logger.error('Failed to cleanup health-check messages:', error);
    }
  }

  /**
   * Manual cleanup method for testing or immediate cleanup
   */
  async performManualCleanup(): Promise<{
    messages: number;
    conversations: number;
  }> {
    try {
      this.logger.log('Performing manual health-check cleanup...');

      const messagesDeleted =
        await this.databaseService.cleanupHealthCheckMessages();
      const conversationsDeleted =
        await this.databaseService.cleanupOrphanedHealthCheckConversations();

      this.logger.log(
        `Manual cleanup completed: ${messagesDeleted} messages, ${conversationsDeleted} conversations deleted`,
      );

      return { messages: messagesDeleted, conversations: conversationsDeleted };
    } catch (error) {
      this.logger.error('Failed to perform manual cleanup:', error);
      throw error;
    }
  }
}
