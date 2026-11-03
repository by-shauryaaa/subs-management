import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import {
  type IdParamDto,
  idParamSchema,
  paginationQuerySchema,
} from '@brightloop/shared';
import {
  type AuthUser,
  CurrentUser,
  Roles,
} from '../../common/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PortalService, updateProfileSchema } from './portal.service.js';

const idPipe = new ZodValidationPipe(idParamSchema);

@Roles('CUSTOMER')
@Controller('portal')
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Get('home')
  async home(@CurrentUser() user: AuthUser) {
    const customerId = await this.portal.getCustomerId(user.sub, user.customerId);
    return this.portal.home(customerId);
  }

  @Get('subscriptions')
  async subscriptions(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: z.infer<typeof paginationQuerySchema>,
  ) {
    const customerId = await this.portal.getCustomerId(user.sub, user.customerId);
    return this.portal.listSubscriptions(customerId, query);
  }

  @Get('subscriptions/:id')
  async subscription(
    @Param(idPipe) { id }: IdParamDto,
    @CurrentUser() user: AuthUser,
  ) {
    const customerId = await this.portal.getCustomerId(user.sub, user.customerId);
    return this.portal.getSubscription(customerId, id);
  }

  @Post('subscriptions/:id/:action')
  @HttpCode(200)
  async transitionSubscription(
    @Param(idPipe) { id }: IdParamDto,
    @Param('action') action: string,
    @Body(
      new ZodValidationPipe(
        z.object({ reason: z.string().trim().max(500).optional() }).default({}),
      ),
    )
    body: { reason?: string },
    @CurrentUser() user: AuthUser,
  ) {
    const customerId = await this.portal.getCustomerId(user.sub, user.customerId);
    return this.portal.transitionSubscription(
      customerId,
      id,
      action,
      user.sub,
      body.reason,
    );
  }

  @Get('invoices')
  async invoices(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: z.infer<typeof paginationQuerySchema>,
  ) {
    const customerId = await this.portal.getCustomerId(user.sub, user.customerId);
    return this.portal.listInvoices(customerId, query);
  }

  @Get('invoices/:id')
  async invoice(
    @Param(idPipe) { id }: IdParamDto,
    @CurrentUser() user: AuthUser,
  ) {
    const customerId = await this.portal.getCustomerId(user.sub, user.customerId);
    return this.portal.getInvoice(customerId, id);
  }

  @Get('invoices/:id/pdf')
  async invoicePdf(
    @Param(idPipe) { id }: IdParamDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const customerId = await this.portal.getCustomerId(user.sub, user.customerId);
    const pdfBuffer = await this.portal.getInvoicePdf(customerId, id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="invoice.pdf"');
    res.send(pdfBuffer);
  }

  @Get('profile')
  async profile(@CurrentUser() user: AuthUser) {
    const customerId = await this.portal.getCustomerId(user.sub, user.customerId);
    return this.portal.getProfile(customerId);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateProfileSchema))
    body: z.infer<typeof updateProfileSchema>,
  ) {
    const customerId = await this.portal.getCustomerId(user.sub, user.customerId);
    return this.portal.updateProfile(customerId, body);
  }
}
