/**
 * Swagger helper functions and constants
 * This file provides reusable Swagger decorators and response schemas
 */

import { ApiResponse, ApiResponseOptions } from '@nestjs/swagger';

export const ApiUnauthorizedResponse = () =>
  ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  });

export const ApiForbiddenResponse = () =>
  ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  });

export const ApiNotFoundResponse = () =>
  ApiResponse({
    status: 404,
    description: 'Resource not found',
  });

export const ApiBadRequestResponse = () =>
  ApiResponse({
    status: 400,
    description: 'Bad request - Validation error',
  });

export const ApiCreatedResponse = (description: string = 'Resource created successfully') =>
  ApiResponse({
    status: 201,
    description,
  });

export const ApiOkResponse = (description: string = 'Operation successful') =>
  ApiResponse({
    status: 200,
    description,
  });

