import { Module } from '@nestjs/common';
import { loadConfiguration, LoopCoreModule } from '@loopstack/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoopstackApiModule } from '@loopstack/api';
import { ConversationEvaluationService } from './services/conversation-evaluation.service';
import { EmailHistoryService } from './services/email-history.service';
import { EmailEntity } from './entities/email.entity';
import { ConversationEvaluationEntity } from './entities/conversation-evaluation.entity';
import { FindDormantConversationTool } from './tools/find-dormant-conversation.tool';
import { UpdateConversationEvaluationTool } from './tools/update-conversation-evaluation.tool';
import { SendEmailTool } from './tools/send-email.tool';
import { LlmModule } from '@loopstack/llm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      database: 'postgres',
      password: 'admin',
      autoLoadEntities: true,
      synchronize: true,
    }),
    LoopCoreModule.forRoot({
      configs: loadConfiguration(__dirname + '/workflows'),
    }),
    LoopstackApiModule,
    LlmModule,
    TypeOrmModule.forFeature([EmailEntity, ConversationEvaluationEntity]),
  ],
  providers: [
    ConversationEvaluationService,
    EmailHistoryService,
    FindDormantConversationTool,
    UpdateConversationEvaluationTool,
    SendEmailTool,
  ],
})
export class AppModule {}
