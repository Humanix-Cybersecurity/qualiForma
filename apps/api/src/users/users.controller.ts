// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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
}
