import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthenticationGuard } from 'src/guards/jwt.guard';
import { AuthRequest } from 'src/guards/admin.guard';
import { SlackService } from 'src/slack/slack.service';
import { CreateFeedbackDTO } from './dto/create-feedback.dto';

@Controller('feedback')
@UseGuards(JwtAuthenticationGuard)
export class FeedbackController {
  constructor(private readonly slackService: SlackService) {}

  @Post()
  submitFeedback(@Req() req: AuthRequest, @Body() dto: CreateFeedbackDTO) {
    const { userNAME } = req.user;
    this.slackService.notify(`[FEEDBACK] from ${userNAME}:\n"${dto.message}"`);
    return { message: 'Thank you for your feedback!' };
  }
}
