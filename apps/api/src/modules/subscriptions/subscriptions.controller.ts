import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  type IdParamDto,
  type SubscriptionAction,
  idParamSchema,
} from '@brightloop/shared';
import {
  type AuthUser,
  CurrentUser,
  Roles,
} from '../../common/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import {
  type SubscriptionBody,
  type SubscriptionListQuery,
  SubscriptionsService,
  subscriptionListSchema,
  subscriptionSchema,
  transitionParamsSchema,
  transitionBodySchema,
} from './subscriptions.service.js';

const idPipe = new ZodValidationPipe(idParamSchema);
@Roles('ADMIN', 'STAFF')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(subscriptionListSchema))
    query: SubscriptionListQuery,
  ) {
    return this.subscriptions.list(query);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(subscriptionSchema)) body: SubscriptionBody,
    @CurrentUser() user: AuthUser,
  ) {
    return this.subscriptions.create(body, user.sub);
  }

  @Get(':id')
  get(@Param(idPipe) { id }: IdParamDto) {
    return this.subscriptions.get(id);
  }

  @Get(':id/preview')
  preview(@Param(idPipe) { id }: IdParamDto) {
    return this.subscriptions.get(id);
  }

  @Get(':id/history')
  history(@Param(idPipe) { id }: IdParamDto) {
    return this.subscriptions.history(id);
  }

  @Patch(':id')
  update(
    @Param(idPipe) { id }: IdParamDto,
    @Body(new ZodValidationPipe(subscriptionSchema.partial()))
    body: Partial<SubscriptionBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.subscriptions.update(id, body, user.sub);
  }

  @Post(':id/:action')
  @HttpCode(200)
  transition(
    @Param(new ZodValidationPipe(transitionParamsSchema))
    params: { id: string; action: SubscriptionAction },
    @Body(new ZodValidationPipe(transitionBodySchema))
    body: { reason?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.subscriptions.transition(
      params.id,
      params.action,
      user.sub,
      body.reason,
    );
  }
}
