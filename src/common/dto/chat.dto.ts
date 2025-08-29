import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({
    description: 'The message content from the user',
    example: 'Hello, I need help finding books about machine learning',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, { message: 'Message cannot exceed 2000 characters' })
  message!: string;

  @ApiPropertyOptional({
    description: 'Optional conversation ID to continue existing conversation',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Conversation ID must be a valid UUID' })
  conversationId?: string;
}

export class UserFeedbackDto {
  @ApiProperty({
    description: 'User rating from 1-5',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty()
  rating!: number;

  @ApiPropertyOptional({
    description: 'Optional user comment',
    example: 'The response was helpful but could be more detailed',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Comment cannot exceed 1000 characters' })
  comment?: string;
}

export class ConversationFeedbackDto {
  @ApiProperty({
    description: 'Conversation ID to provide feedback for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID(4, { message: 'Conversation ID must be a valid UUID' })
  conversationId!: string;

  @ApiProperty({
    description: 'User feedback data',
    type: UserFeedbackDto,
  })
  feedback!: UserFeedbackDto;
}
