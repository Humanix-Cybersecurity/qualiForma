// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { UsersService, type CreateUserInput } from './users.service';

const roleSchema = z.enum(['apprenant', 'formateur', 'referent_handicap']);

const createUserSchema = z.object({
  email: z.string().email(),
  prenom: z.string().max(120).optional(),
  nom: z.string().max(120).optional(),
  role: roleSchema,
  password: z.string().min(12).max(200).optional(),
});

const updateUserSchema = z.object({
  prenom: z.string().max(120).optional(),
  nom: z.string().max(120).optional(),
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
});

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Auth('admin_of')
  create(
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.users.create(body, user);
  }

  @Get()
  @Auth('admin_of', 'formateur')
  list(@Query('role') role?: string) {
    const parsed = roleSchema.safeParse(role);
    return this.users.list(parsed.success ? parsed.data : undefined);
  }

  @Patch(':id')
  @Auth('admin_of')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: z.infer<typeof updateUserSchema>,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.users.update(id, user, body);
  }

  @Delete(':id')
  @Auth('admin_of')
  remove(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.users.remove(id, user);
  }
}
