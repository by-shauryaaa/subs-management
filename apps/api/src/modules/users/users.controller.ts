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
  type CreateStaffDto,
  type IdParamDto,
  type UpdateUserDto,
  type UserListQueryDto,
  createStaffSchema,
  idParamSchema,
  updateUserSchema,
  userListQuerySchema,
} from '@brightloop/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { UsersService } from './users.service.js';

/** Admin only (ADM-02). Role guards are added with P1-02. */
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(userListQuerySchema)) query: UserListQueryDto,
  ) {
    return this.users.list(query);
  }

  @Post()
  createStaff(
    @Body(new ZodValidationPipe(createStaffSchema)) body: CreateStaffDto,
  ) {
    return this.users.createStaff(body);
  }

  @Patch(':id')
  update(
    @Param(new ZodValidationPipe(idParamSchema)) { id }: IdParamDto,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserDto,
  ) {
    return this.users.update(id, body);
  }
}
