import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  type CreateCustomerDto,
  type CustomerListQueryDto,
  type IdParamDto,
  type UpdateCustomerDto,
  createCustomerSchema,
  customerListQuerySchema,
  idParamSchema,
  updateCustomerSchema,
} from '@brightloop/shared';
import { Roles } from '../../common/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CustomersService } from './customers.service.js';

/** Admin and Staff (PRD §5.1).  */
@Roles('ADMIN', 'STAFF')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(customerListQuerySchema))
    query: CustomerListQueryDto,
  ) {
    return this.customers.list(query);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createCustomerSchema)) body: CreateCustomerDto,
  ) {
    return this.customers.create(body);
  }

  @Get(':id')
  get(@Param(new ZodValidationPipe(idParamSchema)) { id }: IdParamDto) {
    return this.customers.get(id);
  }

  @Patch(':id')
  update(
    @Param(new ZodValidationPipe(idParamSchema)) { id }: IdParamDto,
    @Body(new ZodValidationPipe(updateCustomerSchema)) body: UpdateCustomerDto,
  ) {
    return this.customers.update(id, body);
  }
}
