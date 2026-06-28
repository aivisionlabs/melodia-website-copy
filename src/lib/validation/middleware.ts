import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateRequestId } from '@/lib/auth/jwt';

// Validation middleware wrapper
export const validateRequest = <T>(schema: z.ZodSchema<T>) => {
  return (handler: (request: NextRequest, context: any) => Promise<NextResponse>) => {
    return async (request: NextRequest, context: any) => {
      try {
        const requestId = (request as any).requestId || generateRequestId();
        
        // Parse request body
        const body = await request.json();
        
        // Validate against schema
        const validatedData = schema.parse(body);
        
        // Add validated data to request
        (request as any).validatedData = validatedData;
        (request as any).requestId = requestId;
        
        return handler(request, context);
      } catch (error) {
        const requestId = (request as any).requestId || generateRequestId();
        
        if (error instanceof z.ZodError) {
          // Format validation errors
          const details: Record<string, string> = {};
          error.issues.forEach((err: any) => {
            const path = err.path.join('.');
            details[path] = err.message;
          });

          return NextResponse.json(
            {
              success: false,
              error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details
              },
              meta: {
                timestamp: new Date().toISOString(),
                requestId
              }
            },
            { status: 400 }
          );
        }
        
        // Handle JSON parsing errors
        return NextResponse.json(
          { 
            success: false, 
            error: { 
              message: 'Invalid request body', 
              code: 'INVALID_BODY' 
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId
            }
          },
          { status: 400 }
        );
      }
    };
  };
};
