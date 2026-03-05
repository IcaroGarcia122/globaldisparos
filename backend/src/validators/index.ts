/**
 * Validation Schemas using Zod
 * Input validation for all API endpoints
 */

import { z } from 'zod';

// ===================================
// AUTH SCHEMAS
// ===================================
export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ===================================
// INSTANCE SCHEMAS
// ===================================
export const CreateInstanceSchema = z.object({
  name: z.string().min(1, 'Instance name is required').max(100),
  description: z.string().max(500).optional(),
});

export const UpdateInstanceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

// ===================================
// CAMPAIGN SCHEMAS
// ===================================
export const CreateCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100),
  instanceId: z.number().int().positive('Valid instance ID is required'),
  message: z.string().min(1, 'Message is required').max(4096),
  contacts: z.array(z.string().regex(/^[0-9]{10,15}$/, 'Invalid phone number format')).min(1),
  scheduling: z
    .object({
      startTime: z.string().datetime().optional(),
      interval: z.number().int().min(1).optional(),
      intervalUnit: z.enum(['seconds', 'minutes', 'hours']).optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  message: z.string().min(1).max(4096).optional(),
  isActive: z.boolean().optional(),
});

// ===================================
// CONTACT SCHEMAS
// ===================================
export const CreateContactSchema = z.object({
  phoneNumber: z.string().regex(/^[0-9]{10,15}$/, 'Invalid phone number'),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const CreateContactListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  contacts: z.array(CreateContactSchema),
});

// ===================================
// MESSAGE SCHEMAS
// ===================================
export const SendMessageSchema = z.object({
  phoneNumber: z.string().regex(/^[0-9]{10,15}$/, 'Invalid phone number'),
  message: z.string().min(1, 'Message is required').max(4096),
  instanceId: z.number().int().positive(),
});

export const BulkMessageSchema = z.object({
  phoneNumbers: z.array(z.string().regex(/^[0-9]{10,15}$/)),
  message: z.string().min(1).max(4096),
  instanceId: z.number().int().positive(),
  delayMs: z.number().int().min(0).default(1000),
});

// ===================================
// GROUP SCHEMAS
// ===================================
export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  instanceId: z.number().int().positive(),
  participants: z.array(z.string().regex(/^[0-9]{10,15}$/)).min(2).max(256),
});

export const AddGroupParticipantSchema = z.object({
  groupId: z.string().min(1),
  participantNumber: z.string().regex(/^[0-9]{10,15}$/),
});

export const SendGroupMessageSchema = z.object({
  groupId: z.string().min(1),
  message: z.string().min(1).max(4096),
  instanceId: z.number().int().positive(),
});

// ===================================
// QUERY PARAMETER SCHEMAS
// ===================================
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['ASC', 'DESC']).default('DESC'),
});

export const CampaignFilterSchema = PaginationSchema.extend({
  status: z.enum(['pending', 'sending', 'completed', 'failed']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ===================================
// EXPORT TYPES
// ===================================
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type CreateInstanceInput = z.infer<typeof CreateInstanceSchema>;
export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;

/**
 * Validation helper function
 */
export const validateRequest = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    throw {
      name: 'ValidationError',
      statusCode: 400,
      errors,
    };
  }
  return result.data;
};
