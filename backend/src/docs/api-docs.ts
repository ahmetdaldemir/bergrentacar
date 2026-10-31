/**
 * API Documentation
 * OpenAPI/Swagger specification for the API
 * Can be extended with swagger-ui-express for interactive docs
 */

export const apiDocumentation = {
  openapi: '3.0.0',
  info: {
    title: 'SaaS Tour API',
    version: '1.0.0',
    description: 'API documentation for SaaS Tour platform - Rent a Car and Transfer management system',
    contact: {
      name: 'API Support',
      email: 'support@saastour.com',
    },
  },
  servers: [
    {
      url: 'http://{tenant}.local.saastour360.test:5001/api',
      description: 'Local development (multi-tenant)',
      variables: {
        tenant: {
          default: 'berg',
          description: 'Tenant slug (e.g., berg)',
        },
      },
    },
    {
      url: 'https://{tenant}.saastour360.com/api',
      description: 'Production (multi-tenant)',
      variables: {
        tenant: {
          default: 'berg',
          description: 'Tenant slug (e.g., berg)',
        },
      },
    },
    {
      url: 'http://localhost:4001/api',
      description: 'Local development (direct access)',
    },
  ],
  tags: [
    { name: 'Health', description: 'Health check endpoints' },
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Tenants', description: 'Tenant management' },
    { name: 'Tenant Users', description: 'Tenant user management' },
    { name: 'Tours', description: 'Tour management' },
    { name: 'Tour Features', description: 'Tour features management' },
    { name: 'Rent a Car', description: 'Vehicle rental management' },
    { name: 'Vehicles', description: 'Vehicle CRUD operations' },
    { name: 'Vehicle Brands', description: 'Vehicle brand management' },
    { name: 'Vehicle Models', description: 'Vehicle model management' },
    { name: 'Vehicle Categories', description: 'Vehicle category management' },
    { name: 'Locations', description: 'Rent a car location management' },
    { name: 'Location Pricing', description: 'Location vehicle pricing management' },
    { name: 'Location Delivery Pricing', description: 'Location delivery pricing management' },
    { name: 'Extras', description: 'Extra services management' },
    { name: 'Reservations', description: 'Reservation management' },
    { name: 'Surveys', description: 'Survey management' },
    { name: 'Settings', description: 'Tenant settings management' },
    { name: 'Customers', description: 'Customer management' },
    { name: 'Blogs', description: 'Blog management' },
    { name: 'Destinations', description: 'Destination management' },
    { name: 'Hotels', description: 'Hotel management' },
    { name: 'Languages', description: 'Language management' },
    { name: 'Currencies', description: 'Currency management' },
    { name: 'Translations', description: 'Translation management' },
    { name: 'Email Templates', description: 'Email template management' },
    { name: 'Transfer', description: 'VIP Transfer management' },
    { name: 'Transfer Vehicles', description: 'Transfer vehicle management' },
    { name: 'Transfer Routes', description: 'Transfer route management' },
    { name: 'Transfer Pricing', description: 'Transfer pricing management' },
    { name: 'Transfer Reservations', description: 'Transfer reservation management' },
    { name: 'Transfer Drivers', description: 'Transfer driver management' },
    { name: 'Chat', description: 'Chat management' },
    { name: 'Chat Widget', description: 'Chat widget endpoints' },
    { name: 'Admin', description: 'Admin endpoints' },
    { name: 'Monitoring', description: 'System monitoring endpoints' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                enum: ['INTERNAL_ERROR', 'VALIDATION_ERROR', 'NOT_FOUND', 'UNAUTHORIZED', 'FORBIDDEN', 'DUPLICATE_ENTRY'],
                example: 'VALIDATION_ERROR',
              },
              message: {
                type: 'string',
                example: 'Validation failed',
              },
              details: {
                type: 'object',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
              },
            },
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Unauthorized access',
                timestamp: '2024-01-01T00:00:00.000Z',
              },
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'Resource not found',
                timestamp: '2024-01-01T00:00:00.000Z',
              },
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: {
                  field: 'email',
                  message: 'Invalid email format',
                },
                timestamp: '2024-01-01T00:00:00.000Z',
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Check if the API is running',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'ok',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'User login',
        description: 'Authenticate user and get JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'user@example.com',
                  },
                  password: {
                    type: 'string',
                    format: 'password',
                    example: 'password123',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: {
                      type: 'string',
                      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    },
                    user: {
                      type: 'object',
                    },
                  },
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'User registration',
        description: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                  },
                  password: {
                    type: 'string',
                    format: 'password',
                  },
                  name: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Registration successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/ValidationError',
          },
        },
      },
    },
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'User signup',
        description: 'Sign up a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Signup successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user',
        description: 'Get authenticated user information',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError',
          },
        },
      },
    },
    '/tenants': {
      get: {
        tags: ['Tenants'],
        summary: 'List tenants',
        description: 'Get list of all tenants',
        responses: {
          '200': {
            description: 'List of tenants',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      slug: { type: 'string' },
                      category: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Tenants'],
        summary: 'Create tenant',
        description: 'Create a new tenant',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'slug', 'category'],
                properties: {
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  category: { type: 'string', enum: ['rentacar', 'transfer', 'tour'] },
                  defaultLanguage: { type: 'string' },
                  supportEmail: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tenant created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/tenant-users': {
      get: {
        tags: ['Tenant Users'],
        summary: 'List tenant users',
        description: 'Get list of tenant users',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of tenant users',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Tenant Users'],
        summary: 'Create tenant user',
        description: 'Create a new tenant user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  name: { type: 'string' },
                  tenantId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tenant user created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/tenant-users/{id}': {
      get: {
        tags: ['Tenant Users'],
        summary: 'Get tenant user by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Tenant user details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Tenant Users'],
        summary: 'Update tenant user',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tenant user updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Tenant Users'],
        summary: 'Delete tenant user',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Tenant user deleted',
          },
        },
      },
    },
    '/rentacar/vehicles': {
      get: {
        tags: ['Vehicles'],
        summary: 'List vehicles',
        description: 'Get list of all vehicles',
        parameters: [
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of vehicles',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Vehicles'],
        summary: 'Create vehicle',
        description: 'Create a new vehicle',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  categoryId: { type: 'string' },
                  brandId: { type: 'string' },
                  modelId: { type: 'string' },
                  year: { type: 'integer' },
                  baseRate: { type: 'number' },
                  currencyCode: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Vehicle created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/rentacar/vehicles/{id}': {
      get: {
        tags: ['Vehicles'],
        summary: 'Get vehicle by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Vehicle details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Vehicles'],
        summary: 'Update vehicle',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Vehicle updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Vehicles'],
        summary: 'Partially update vehicle',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Vehicle updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Vehicles'],
        summary: 'Delete vehicle',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Vehicle deleted',
          },
        },
      },
    },
    '/rentacar/vehicles/{vehicleId}/plates': {
      post: {
        tags: ['Vehicles'],
        summary: 'Add plate to vehicle',
        parameters: [
          {
            name: 'vehicleId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  plateNumber: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Plate added',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/rentacar/vehicles/{vehicleId}/plates/{plateId}': {
      put: {
        tags: ['Vehicles'],
        summary: 'Update vehicle plate',
        parameters: [
          {
            name: 'vehicleId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'plateId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  plateNumber: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Plate updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Vehicles'],
        summary: 'Partially update vehicle plate',
        parameters: [
          {
            name: 'vehicleId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'plateId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Plate updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Vehicles'],
        summary: 'Delete vehicle plate',
        parameters: [
          {
            name: 'vehicleId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'plateId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Plate deleted',
          },
        },
      },
    },
    '/rentacar/vehicles/{vehicleId}/pricing': {
      post: {
        tags: ['Vehicles'],
        summary: 'Upsert vehicle pricing',
        parameters: [
          {
            name: 'vehicleId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  month: { type: 'integer' },
                  dailyRate: { type: 'number' },
                  weeklyRate: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Pricing updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/rentacar/vehicles/{id}/last-return-location': {
      put: {
        tags: ['Vehicles'],
        summary: 'Update vehicle last return location',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  lastReturnLocationId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Last return location updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Vehicles'],
        summary: 'Partially update vehicle last return location',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  lastReturnLocationId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Last return location updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/rentacar/reservations/{reservationId}/assignments': {
      post: {
        tags: ['Reservations'],
        summary: 'Assign plate to reservation',
        parameters: [
          {
            name: 'reservationId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  plateId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Plate assigned',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/rentacar/locations': {
      get: {
        tags: ['Locations'],
        summary: 'List locations',
        description: 'Get list of all rent a car locations',
        parameters: [
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of locations',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Locations'],
        summary: 'Create location',
        description: 'Create a new rent a car location',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['merkez', 'havalimani', 'otel', 'adres'] },
                  parentId: { type: 'string' },
                  deliveryFee: { type: 'number' },
                  dropFee: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Location created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/rentacar/locations/{id}': {
      get: {
        tags: ['Locations'],
        summary: 'Get location by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Location details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Locations'],
        summary: 'Update location',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Location updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Locations'],
        summary: 'Partially update location',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Location updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Locations'],
        summary: 'Delete location',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Location deleted',
          },
        },
      },
    },
    '/rentacar/location-pricing': {
      get: {
        tags: ['Location Pricing'],
        summary: 'List location pricing',
        description: 'Get location pricing list',
        parameters: [
          {
            name: 'locationId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of location pricing',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Location Pricing'],
        summary: 'Upsert location pricing',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  locationId: { type: 'string' },
                  vehicleId: { type: 'string' },
                  month: { type: 'integer' },
                  dayRange: { type: 'string' },
                  price: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Location pricing updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/rentacar/location-pricing/by-vehicle': {
      get: {
        tags: ['Location Pricing'],
        summary: 'Get pricing by location and vehicle',
        parameters: [
          {
            name: 'locationId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'vehicleId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Location pricing details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/rentacar/location-pricing/bulk': {
      post: {
        tags: ['Location Pricing'],
        summary: 'Bulk upsert location pricing',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Bulk pricing updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/rentacar/location-pricing/bulk-copy': {
      post: {
        tags: ['Location Pricing'],
        summary: 'Bulk copy location pricing',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sourceLocationId: { type: 'string' },
                  targetLocationIds: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  vehicleId: { type: 'string' },
                  month: { type: 'integer' },
                  dayRange: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Pricing copied',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/rentacar/location-pricing/{id}': {
      delete: {
        tags: ['Location Pricing'],
        summary: 'Delete location pricing',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Location pricing deleted',
          },
        },
      },
    },
    '/rentacar/location-delivery-pricing': {
      get: {
        tags: ['Location Delivery Pricing'],
        summary: 'List location delivery pricing',
        parameters: [
          {
            name: 'locationId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of delivery pricing',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Location Delivery Pricing'],
        summary: 'Create location delivery pricing',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  locationId: { type: 'string' },
                  deliveryLocationId: { type: 'string' },
                  distance: { type: 'number' },
                  fee: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Delivery pricing created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/rentacar/location-delivery-pricing/{id}': {
      put: {
        tags: ['Location Delivery Pricing'],
        summary: 'Update location delivery pricing',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Delivery pricing updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Location Delivery Pricing'],
        summary: 'Delete location delivery pricing',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Delivery pricing deleted',
          },
        },
      },
    },
    '/rentacar/extras': {
      get: {
        tags: ['Extras'],
        summary: 'List extras',
        description: 'Get list of all extra services',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of extras',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Extras'],
        summary: 'Create extra',
        description: 'Create a new extra service',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  price: { type: 'number' },
                  currencyCode: { type: 'string' },
                  salesType: { type: 'string', enum: ['daily', 'per_rental'] },
                  isActive: { type: 'boolean' },
                  isMandatory: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Extra created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/rentacar/extras/{id}': {
      get: {
        tags: ['Extras'],
        summary: 'Get extra by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Extra details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Extras'],
        summary: 'Update extra',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Extra updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Extras'],
        summary: 'Delete extra',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Extra deleted',
          },
        },
      },
    },
    '/vehicle-brands': {
      get: {
        tags: ['Vehicle Brands'],
        summary: 'List vehicle brands',
        responses: {
          '200': {
            description: 'List of vehicle brands',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Vehicle Brands'],
        summary: 'Create vehicle brand',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Brand created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/vehicle-brands/{id}': {
      get: {
        tags: ['Vehicle Brands'],
        summary: 'Get vehicle brand by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Brand details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Vehicle Brands'],
        summary: 'Update vehicle brand',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Brand updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Vehicle Brands'],
        summary: 'Partially update vehicle brand',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Brand updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Vehicle Brands'],
        summary: 'Delete vehicle brand',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Brand deleted',
          },
        },
      },
    },
    '/vehicle-models': {
      get: {
        tags: ['Vehicle Models'],
        summary: 'List vehicle models',
        parameters: [
          {
            name: 'brandId',
            in: 'query',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of vehicle models',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Vehicle Models'],
        summary: 'Create vehicle model',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  brandId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Model created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/vehicle-models/{id}': {
      get: {
        tags: ['Vehicle Models'],
        summary: 'Get vehicle model by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Model details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Vehicle Models'],
        summary: 'Update vehicle model',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Model updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Vehicle Models'],
        summary: 'Partially update vehicle model',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Model updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Vehicle Models'],
        summary: 'Delete vehicle model',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Model deleted',
          },
        },
      },
    },
    '/vehicle-categories': {
      get: {
        tags: ['Vehicle Categories'],
        summary: 'List vehicle categories',
        responses: {
          '200': {
            description: 'List of vehicle categories',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Vehicle Categories'],
        summary: 'Create vehicle category',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Category created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/vehicle-categories/{id}': {
      get: {
        tags: ['Vehicle Categories'],
        summary: 'Get vehicle category by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Category details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Vehicle Categories'],
        summary: 'Update vehicle category',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Category updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Vehicle Categories'],
        summary: 'Partially update vehicle category',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Category updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Vehicle Categories'],
        summary: 'Delete vehicle category',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Category deleted',
          },
        },
      },
    },
    '/crm/customers': {
      get: {
        tags: ['Customers'],
        summary: 'List customers',
        description: 'Get list of all customers',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of customers',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Customers'],
        summary: 'Create customer',
        description: 'Create a new customer',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  mobilePhone: { type: 'string' },
                  idNumber: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Customer created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/crm/customers/{id}': {
      get: {
        tags: ['Customers'],
        summary: 'Get customer by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Customer details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Customers'],
        summary: 'Update customer',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Customer updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Customers'],
        summary: 'Delete customer',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Customer deleted',
          },
        },
      },
    },
    '/reservations': {
      get: {
        tags: ['Reservations'],
        summary: 'List reservations',
        description: 'Get list of all reservations',
        parameters: [
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of reservations',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    '/reservations/{id}': {
      get: {
        tags: ['Reservations'],
        summary: 'Get reservation by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Reservation details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Reservations'],
        summary: 'Update reservation',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Reservation updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/reservations/{id}/status': {
      put: {
        tags: ['Reservations'],
        summary: 'Update reservation status',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Reservation status updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/blogs': {
      get: {
        tags: ['Blogs'],
        summary: 'List blogs',
        description: 'Get list of all blog posts',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of blogs',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Blogs'],
        summary: 'Create blog',
        description: 'Create a new blog post',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  content: { type: 'string' },
                  isPublished: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Blog created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/blogs/{id}': {
      get: {
        tags: ['Blogs'],
        summary: 'Get blog by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Blog details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Blogs'],
        summary: 'Update blog',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Blog updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Blogs'],
        summary: 'Delete blog',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Blog deleted',
          },
        },
      },
    },
    '/destinations': {
      get: {
        tags: ['Destinations'],
        summary: 'List destinations',
        description: 'Get list of all destinations',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of destinations',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Destinations'],
        summary: 'Create destination',
        description: 'Create a new destination',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  country: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Destination created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/destinations/{id}': {
      patch: {
        tags: ['Destinations'],
        summary: 'Update destination',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Destination updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Destinations'],
        summary: 'Delete destination',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Destination deleted',
          },
        },
      },
    },
    '/destinations/import': {
      post: {
        tags: ['Destinations'],
        summary: 'Import destinations from API',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Destinations imported',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/hotels': {
      get: {
        tags: ['Hotels'],
        summary: 'List hotels',
        description: 'Get list of all hotels',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of hotels',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Hotels'],
        summary: 'Create hotel',
        description: 'Create a new hotel',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  destinationId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Hotel created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/hotels/{id}': {
      patch: {
        tags: ['Hotels'],
        summary: 'Update hotel',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Hotel updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Hotels'],
        summary: 'Delete hotel',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Hotel deleted',
          },
        },
      },
    },
    '/languages': {
      get: {
        tags: ['Languages'],
        summary: 'List languages',
        description: 'Get list of all languages',
        responses: {
          '200': {
            description: 'List of languages',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Languages'],
        summary: 'Create language',
        description: 'Create a new language',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  name: { type: 'string' },
                  isActive: { type: 'boolean' },
                  isDefault: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Language created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/languages/{id}': {
      patch: {
        tags: ['Languages'],
        summary: 'Update language',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Language updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Languages'],
        summary: 'Delete language',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Language deleted',
          },
        },
      },
    },
    '/languages/{id}/set-default': {
      post: {
        tags: ['Languages'],
        summary: 'Set default language',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Default language set',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/currencies': {
      get: {
        tags: ['Currencies'],
        summary: 'List currencies',
        description: 'Get list of all currencies',
        responses: {
          '200': {
            description: 'List of currencies',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Currencies'],
        summary: 'Create currency',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  name: { type: 'string' },
                  symbol: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Currency created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/currencies/{id}': {
      put: {
        tags: ['Currencies'],
        summary: 'Update currency',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Currency updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Currencies'],
        summary: 'Delete currency',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Currency deleted',
          },
        },
      },
    },
    '/currencies/{code}/rate': {
      put: {
        tags: ['Currencies'],
        summary: 'Update currency rate',
        parameters: [
          {
            name: 'code',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  rate: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Currency rate updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/currencies/update-rates': {
      post: {
        tags: ['Currencies'],
        summary: 'Update all currency rates',
        responses: {
          '200': {
            description: 'Currency rates updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/currencies/{code}/update-rate': {
      post: {
        tags: ['Currencies'],
        summary: 'Update single currency rate',
        parameters: [
          {
            name: 'code',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Currency rate updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/tours': {
      get: {
        tags: ['Tours'],
        summary: 'List tours',
        description: 'Get list of all tours',
        parameters: [
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of tours',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Tours'],
        summary: 'Create tour',
        description: 'Create a new tour',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  destinationId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tour created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/tours/{id}': {
      get: {
        tags: ['Tours'],
        summary: 'Get tour by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Tour details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Tours'],
        summary: 'Update tour',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tour updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Tours'],
        summary: 'Delete tour',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Tour deleted',
          },
        },
      },
    },
    '/tour-features': {
      get: {
        tags: ['Tour Features'],
        summary: 'List tour features',
        responses: {
          '200': {
            description: 'List of tour features',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Tour Features'],
        summary: 'Create tour feature',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tour feature created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/tour-features/{id}': {
      get: {
        tags: ['Tour Features'],
        summary: 'Get tour feature by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Tour feature details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Tour Features'],
        summary: 'Update tour feature',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tour feature updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Tour Features'],
        summary: 'Delete tour feature',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Tour feature deleted',
          },
        },
      },
    },
    '/settings/site': {
      get: {
        tags: ['Settings'],
        summary: 'Get site settings',
        description: 'Get tenant site settings',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Site settings',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Settings'],
        summary: 'Update site settings',
        description: 'Update tenant site settings',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Site settings updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/surveys': {
      get: {
        tags: ['Surveys'],
        summary: 'List surveys',
        description: 'Get list of all surveys',
        parameters: [
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of surveys',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Surveys'],
        summary: 'Create survey',
        description: 'Create a new survey',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Survey created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/surveys/{id}': {
      get: {
        tags: ['Surveys'],
        summary: 'Get survey by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Survey details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Surveys'],
        summary: 'Update survey',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Survey updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Surveys'],
        summary: 'Delete survey',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Survey deleted',
          },
        },
      },
    },
    '/email-templates': {
      get: {
        tags: ['Email Templates'],
        summary: 'List email templates',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'tenantId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of email templates',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Email Templates'],
        summary: 'Create email template',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  subject: { type: 'string' },
                  content: { type: 'string' },
                  languageId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Email template created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/email-templates/{id}': {
      get: {
        tags: ['Email Templates'],
        summary: 'Get email template by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Email template details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Email Templates'],
        summary: 'Update email template',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Email template updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Email Templates'],
        summary: 'Delete email template',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Email template deleted',
          },
        },
      },
    },
    '/surveys/{surveyId}/questions': {
      post: {
        tags: ['Surveys'],
        summary: 'Add question to survey',
        parameters: [
          {
            name: 'surveyId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  type: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Question added',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/surveys/questions/{id}': {
      put: {
        tags: ['Surveys'],
        summary: 'Update survey question',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Question updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Surveys'],
        summary: 'Delete survey question',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Question deleted',
          },
        },
      },
    },
    '/surveys/responses': {
      post: {
        tags: ['Surveys'],
        summary: 'Submit survey response',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  surveyId: { type: 'string' },
                  reservationId: { type: 'string' },
                  answers: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Response submitted',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/surveys/{surveyId}/responses': {
      get: {
        tags: ['Surveys'],
        summary: 'Get survey responses',
        parameters: [
          {
            name: 'surveyId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of responses',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    '/surveys/reservations/{reservationId}/responses': {
      get: {
        tags: ['Surveys'],
        summary: 'Get responses by reservation',
        parameters: [
          {
            name: 'reservationId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of responses',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    '/translation/translate': {
      post: {
        tags: ['Translations'],
        summary: 'Translate text',
        description: 'Translate text using DeepL API',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  targetLang: { type: 'string' },
                  sourceLang: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Translation result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/translation/translate-multiple': {
      post: {
        tags: ['Translations'],
        summary: 'Translate multiple texts',
        description: 'Translate multiple texts using DeepL API',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  texts: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  targetLang: { type: 'string' },
                  sourceLang: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Translation results',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    '/transfer/vehicles': {
      get: {
        tags: ['Transfer Vehicles'],
        summary: 'List transfer vehicles',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of transfer vehicles',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Transfer Vehicles'],
        summary: 'Create transfer vehicle',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  capacity: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Transfer vehicle created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/transfer/vehicles/{id}': {
      get: {
        tags: ['Transfer Vehicles'],
        summary: 'Get transfer vehicle by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Transfer vehicle details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Transfer Vehicles'],
        summary: 'Update transfer vehicle',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Transfer vehicle updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Transfer Vehicles'],
        summary: 'Delete transfer vehicle',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Transfer vehicle deleted',
          },
        },
      },
    },
    '/transfer/pricings': {
      get: {
        tags: ['Transfer Pricing'],
        summary: 'List transfer pricing',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of transfer pricing',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Transfer Pricing'],
        summary: 'Create transfer pricing',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  routeId: { type: 'string' },
                  vehicleId: { type: 'string' },
                  price: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Transfer pricing created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/transfer/pricings/{id}': {
      get: {
        tags: ['Transfer Pricing'],
        summary: 'Get transfer pricing by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Transfer pricing details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Transfer Pricing'],
        summary: 'Update transfer pricing',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Transfer pricing updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Transfer Pricing'],
        summary: 'Delete transfer pricing',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Transfer pricing deleted',
          },
        },
      },
    },
    '/transfer/reservations': {
      get: {
        tags: ['Transfer Reservations'],
        summary: 'List transfer reservations',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of transfer reservations',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Transfer Reservations'],
        summary: 'Create transfer reservation',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  routeId: { type: 'string' },
                  vehicleId: { type: 'string' },
                  customerId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Transfer reservation created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/transfer/reservations/{id}': {
      get: {
        tags: ['Transfer Reservations'],
        summary: 'Get transfer reservation by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Transfer reservation details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Transfer Reservations'],
        summary: 'Update transfer reservation',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Transfer reservation updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Transfer Reservations'],
        summary: 'Delete transfer reservation',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Transfer reservation deleted',
          },
        },
      },
    },
    '/transfer/drivers': {
      get: {
        tags: ['Transfer Drivers'],
        summary: 'List transfer drivers',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of transfer drivers',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Transfer Drivers'],
        summary: 'Create transfer driver',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Transfer driver created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/transfer/drivers/{id}': {
      get: {
        tags: ['Transfer Drivers'],
        summary: 'Get transfer driver by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Transfer driver details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Transfer Drivers'],
        summary: 'Update transfer driver',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Transfer driver updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Transfer Drivers'],
        summary: 'Delete transfer driver',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '204': {
            description: 'Transfer driver deleted',
          },
        },
      },
    },
    '/chat/rooms': {
      get: {
        tags: ['Chat'],
        summary: 'List chat rooms',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of chat rooms',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Chat'],
        summary: 'Create chat room',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Chat room created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/chat/rooms/{id}': {
      get: {
        tags: ['Chat'],
        summary: 'Get chat room by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Chat room details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/chat/rooms/{id}/messages': {
      post: {
        tags: ['Chat'],
        summary: 'Send message to chat room',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Message sent',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/chat/rooms/{id}/read': {
      post: {
        tags: ['Chat'],
        summary: 'Mark chat room as read',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Room marked as read',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/chat/widget-token': {
      get: {
        tags: ['Chat'],
        summary: 'Get widget token',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Widget token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/chat/widget-token/regenerate': {
      post: {
        tags: ['Chat'],
        summary: 'Regenerate widget token',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Token regenerated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/admin/monitoring/services': {
      get: {
        tags: ['Monitoring'],
        summary: 'Get services status',
        description: 'Get status of all Docker services',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Services status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    services: {
                      type: 'array',
                      items: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/admin/monitoring/services/{serviceName}/logs': {
      get: {
        tags: ['Monitoring'],
        summary: 'Get service logs',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'serviceName',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Service logs',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
    '/admin/monitoring/stats': {
      get: {
        tags: ['Monitoring'],
        summary: 'Get system stats',
        description: 'Get system resource usage statistics',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'System stats',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                },
              },
            },
          },
        },
      },
    },
    '/admin/monitoring/services/{serviceName}/start': {
      post: {
        tags: ['Monitoring'],
        summary: 'Start service',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'serviceName',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Service started',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/admin/monitoring/services/{serviceName}/stop': {
      post: {
        tags: ['Monitoring'],
        summary: 'Stop service',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'serviceName',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Service stopped',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/admin/monitoring/services/{serviceName}/restart': {
      post: {
        tags: ['Monitoring'],
        summary: 'Restart service',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'serviceName',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Service restarted',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/admin/monitoring/test-email': {
      post: {
        tags: ['Monitoring'],
        summary: 'Send test email',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  to: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Test email sent',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success',
                },
              },
            },
          },
        },
      },
    },
    '/admin/tenants': {
      get: {
        tags: ['Admin'],
        summary: 'List tenants with stats',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of tenants with statistics',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    '/admin/tenants/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get tenant details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Tenant details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/admin/tenants/{id}/activity': {
      get: {
        tags: ['Admin'],
        summary: 'Get tenant activity',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Tenant activity logs',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * Generate API documentation endpoint
 * Can be used with swagger-ui-express for interactive docs
 */
export const getApiDocs = () => {
  return apiDocumentation;
};
