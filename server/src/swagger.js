import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AeroMaintain Pro API',
      version: '1.0.0',
      description: 'API documentation for AeroMaintain Pro - Maintenance Management System',
      contact: {
        name: 'Support',
        email: 'support@aeromaintain.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000/api',
        description: 'Local server',
      },
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
            message: {
              type: 'string',
            },
            code: {
              type: 'string',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/models/*.js'], // files containing annotations as above
};

export const specs = swaggerJsdoc(options);
