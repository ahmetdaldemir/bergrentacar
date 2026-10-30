/**
 * API Documentation Routes
 * Serves OpenAPI/Swagger documentation
 */

import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { getApiDocs } from '../docs/api-docs';

const router = Router();

/**
 * GET /docs
 * Returns OpenAPI/Swagger JSON specification
 */
router.get('/docs', (req: Request, res: Response) => {
  res.json(getApiDocs());
});

/**
 * GET /docs/ui
 * Serves Swagger UI for interactive API documentation
 */
const swaggerUiSetup = swaggerUi.setup(getApiDocs(), {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SaaS Tour API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
  },
});

router.use('/docs/ui', swaggerUi.serve, swaggerUiSetup);

/**
 * GET /docs/readme
 * Returns API documentation in markdown format
 */
router.get('/docs/readme', (req: Request, res: Response) => {
  const readme = `# SaaS Tour API Documentation

## Base URL
- Development: http://localhost:4001/api
- Production: https://api.saastour.com/api

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <token>
\`\`\`

## Error Response Format
All errors follow a standardized format:
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {},
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
\`\`\`

## Success Response Format
Successful responses:
\`\`\`json
{
  "success": true,
  "data": {}
}
\`\`\`

## Error Codes
- \`INTERNAL_ERROR\`: Internal server error
- \`VALIDATION_ERROR\`: Request validation failed
- \`NOT_FOUND\`: Resource not found
- \`UNAUTHORIZED\`: Authentication required
- \`FORBIDDEN\`: Access denied
- \`DUPLICATE_ENTRY\`: Resource already exists
- \`INVALID_INPUT\`: Invalid input data
- \`RESOURCE_CONFLICT\`: Resource conflict

## Main Endpoints

### Authentication
- \`POST /auth/login\` - User login
- \`POST /auth/register\` - User registration

### Tenants
- \`GET /tenants\` - List tenants
- \`POST /tenants\` - Create tenant

### Rent a Car
- \`GET /rentacar/vehicles\` - List vehicles
- \`POST /rentacar/vehicles\` - Create vehicle
- \`GET /rentacar/vehicles/:id\` - Get vehicle
- \`PUT /rentacar/vehicles/:id\` - Update vehicle
- \`DELETE /rentacar/vehicles/:id\` - Delete vehicle

### Transfer
- \`GET /transfer/vehicles\` - List transfer vehicles
- \`POST /transfer/vehicles\` - Create transfer vehicle
- Popüler rotalar: \`GET/POST /transfer/popular-routes\` (Google Maps ile A/B noktası, mesafe/süre, fiyat)
- \`GET /transfer/reservations\` - List transfer reservations
- \`POST /transfer/reservations\` - Create transfer reservation

### Reservations
- \`GET /reservations\` - List reservations
- \`POST /reservations\` - Create reservation
- \`GET /reservations/:id\` - Get reservation
- \`PUT /reservations/:id\` - Update reservation

### Settings
- \`GET /settings\` - Get tenant settings
- \`PUT /settings\` - Update tenant settings

## Rate Limiting
API requests are rate-limited. Check response headers for rate limit information.

## Support
For API support, contact: support@saastour.com
`;

  res.setHeader('Content-Type', 'text/markdown');
  res.send(readme);
});

export default router;

