```
budget-mgt-api/
│
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth/
│   │   │   │   ├── auth.handlers.ts
│   │   │   │   ├── auth.index.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   └── auth.types.ts
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── users.handlers.ts
│   │   │   │   ├── users.index.ts
│   │   │   │   ├── users.routes.ts
│   │   │   │   └── users.types.ts
│   │   │   │
│   │   │   ├── districts/
│   │   │   │   ├── districts.handlers.ts      # (existing)
│   │   │   │   ├── districts.index.ts         # (existing)
│   │   │   │   ├── districts.routes.ts        # (existing)
│   │   │   │   └── districts.types.ts         # (existing)
│   │   │   │
│   │   │   ├── provinces/
│   │   │   │   ├── provinces.handlers.ts
│   │   │   │   ├── provinces.index.ts
│   │   │   │   ├── provinces.routes.ts
│   │   │   │   └── provinces.types.ts
│   │   │   │
│   │   │   ├── facilities/
│   │   │   │   ├── facilities.handlers.ts
│   │   │   │   ├── facilities.index.ts
│   │   │   │   ├── facilities.routes.ts
│   │   │   │   └── facilities.types.ts
│   │   │   │
│   │   │   ├── projects/
│   │   │   │   ├── projects.handlers.ts
│   │   │   │   ├── projects.index.ts
│   │   │   │   ├── projects.routes.ts
│   │   │   │   └── projects.types.ts
│   │   │   │
│   │   │   ├── reporting-periods/
│   │   │   │   ├── reporting-periods.handlers.ts
│   │   │   │   ├── reporting-periods.index.ts
│   │   │   │   ├── reporting-periods.routes.ts
│   │   │   │   └── reporting-periods.types.ts
│   │   │   │
│   │   │   ├── schemas/
│   │   │   │   ├── schemas.handlers.ts
│   │   │   │   ├── schemas.index.ts
│   │   │   │   ├── schemas.routes.ts
│   │   │   │   └── schemas.types.ts
│   │   │   │
│   │   │   ├── form-fields/
│   │   │   │   ├── form-fields.handlers.ts
│   │   │   │   ├── form-fields.index.ts
│   │   │   │   ├── form-fields.routes.ts
│   │   │   │   └── form-fields.types.ts
│   │   │   │
│   │   │   ├── categories/
│   │   │   │   ├── categories.handlers.ts
│   │   │   │   ├── categories.index.ts
│   │   │   │   ├── categories.routes.ts
│   │   │   │   └── categories.types.ts
│   │   │   │
│   │   │   ├── activities/
│   │   │   │   ├── activities.handlers.ts
│   │   │   │   ├── activities.index.ts
│   │   │   │   ├── activities.routes.ts
│   │   │   │   └── activities.types.ts
│   │   │   │
│   │   │   ├── events/
│   │   │   │   ├── events.handlers.ts
│   │   │   │   ├── events.index.ts
│   │   │   │   ├── events.routes.ts
│   │   │   │   └── events.types.ts
│   │   │   │
│   │   │   ├── event-mappings/
│   │   │   │   ├── event-mappings.handlers.ts
│   │   │   │   ├── event-mappings.index.ts
│   │   │   │   ├── event-mappings.routes.ts
│   │   │   │   └── event-mappings.types.ts
│   │   │   │
│   │   │   ├── planning/
│   │   │   │   ├── planning.handlers.ts
│   │   │   │   ├── planning.index.ts
│   │   │   │   ├── planning.routes.ts
│   │   │   │   └── planning.types.ts
│   │   │   │
│   │   │   ├── execution/
│   │   │   │   ├── execution.handlers.ts
│   │   │   │   ├── execution.index.ts
│   │   │   │   ├── execution.routes.ts
│   │   │   │   └── execution.types.ts
│   │   │   │
│   │   │   ├── statement-templates/
│   │   │   │   ├── statement-templates.handlers.ts
│   │   │   │   ├── statement-templates.index.ts
│   │   │   │   ├── statement-templates.routes.ts
│   │   │   │   └── statement-templates.types.ts
│   │   │   │
│   │   │   ├── financial-reports/
│   │   │   │   ├── financial-reports.handlers.ts
│   │   │   │   ├── financial-reports.index.ts
│   │   │   │   ├── financial-reports.routes.ts
│   │   │   │   └── financial-reports.types.ts
│   │   │   │
│   │   │   ├── statements/
│   │   │   │   ├── statements.handlers.ts
│   │   │   │   ├── statements.index.ts
│   │   │   │   ├── statements.routes.ts
│   │   │   │   └── statements.types.ts
│   │   │   │
│   │   │   ├── configurations/
│   │   │   │   ├── configurations.handlers.ts
│   │   │   │   ├── configurations.index.ts
│   │   │   │   ├── configurations.routes.ts
│   │   │   │   └── configurations.types.ts
│   │   │   │
│   │   │   ├── validation/
│   │   │   │   ├── validation.handlers.ts
│   │   │   │   ├── validation.index.ts
│   │   │   │   ├── validation.routes.ts
│   │   │   │   └── validation.types.ts
│   │   │   │
│   │   │   ├── computation/
│   │   │   │   ├── computation.handlers.ts
│   │   │   │   ├── computation.index.ts
│   │   │   │   ├── computation.routes.ts
│   │   │   │   └── computation.types.ts
│   │   │   │
│   │   │   ├── bulk/
│   │   │   │   ├── bulk.handlers.ts
│   │   │   │   ├── bulk.index.ts
│   │   │   │   ├── bulk.routes.ts
│   │   │   │   └── bulk.types.ts
│   │   │   │
│   │   │   ├── migration/
│   │   │   │   ├── migration.handlers.ts
│   │   │   │   ├── migration.index.ts
│   │   │   │   ├── migration.routes.ts
│   │   │   │   └── migration.types.ts
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   ├── analytics.handlers.ts
│   │   │   │   ├── analytics.index.ts
│   │   │   │   ├── analytics.routes.ts
│   │   │   │   └── analytics.types.ts
│   │   │   │
│   │   │   └── dashboard/
│   │   │       ├── dashboard.handlers.ts
│   │   │       ├── dashboard.index.ts
│   │   │       ├── dashboard.routes.ts
│   │   │       └── dashboard.types.ts
│   │   │
│   │   └── index.route.ts                     # (existing - needs updating)
│   │
│   ├── db/
│   │   ├── schema/
│   │   │   ├── index.ts                       # Export all schemas
│   │   │   ├── auth.ts                        # Auth-related tables
│   │   │   ├── core.ts                        # Core entities (users, projects, facilities)
│   │   │   ├── reference.ts                   # Reference data (provinces, districts)
│   │   │   ├── schema-driven.ts               # New schema-driven tables
│   │   │   ├── financial.ts                   # Financial reports and statements
│   │   │   ├── configuration.ts               # System configurations
│   │   │   └── audit.ts                       # Audit and logging tables
│   │   │
│   │   ├── migrations/
│   │   │   ├── 0001_initial_schema.sql
│   │   │   ├── 0002_schema_driven_tables.sql
│   │   │   ├── 0003_enhanced_financial_reports.sql
│   │   │   └── 0004_configuration_audit_tables.sql
│   │   │
│   │   ├── relations/
│   │   │   ├── index.ts                       # Export all relations
│   │   │   ├── core.relations.ts              # Core entity relations
│   │   │   ├── schema-driven.relations.ts     # Schema-driven relations
│   │   │   ├── financial.relations.ts         # Financial data relations
│   │   │   └── reference.relations.ts         # Reference data relations
│   │   │
│   │   ├── seeds/
│   │   │   ├── index.ts
│   │   │   ├── 01-provinces-districts.ts
│   │   │   ├── 02-facilities.ts
│   │   │   ├── 03-users-auth.ts
│   │   │   ├── 04-projects-periods.ts
│   │   │   ├── 05-events.ts
│   │   │   ├── 06-form-schemas.ts
│   │   │   ├── 07-categories-activities.ts
│   │   │   ├── 08-statement-templates.ts
│   │   │   └── 09-system-configurations.ts
│   │   │
│   │   └── index.ts                           # Database connection and query
│   │
│   ├── lib/
│   │   ├── types/
│   │   │   ├── index.ts                       # Export all types
│   │   │   ├── api.types.ts                   # Common API types
│   │   │   ├── auth.types.ts                  # Authentication types
│   │   │   ├── schema.types.ts                # Form schema types
│   │   │   ├── validation.types.ts            # Validation types
│   │   │   ├── computation.types.ts           # Computation engine types
│   │   │   └── reporting.types.ts             # Reporting types
│   │   │
│   │   ├── utils/
│   │   │   ├── index.ts
│   │   │   ├── validation.utils.ts            # Validation utilities
│   │   │   ├── computation.utils.ts           # Computation utilities
│   │   │   ├── schema.utils.ts                # Schema manipulation utilities
│   │   │   ├── date.utils.ts                  # Date handling utilities
│   │   │   ├── response.utils.ts              # Response formatting utilities
│   │   │   └── error.utils.ts                 # Error handling utilities
│   │   │
│   │   ├── services/
│   │   │   ├── index.ts
│   │   │   ├── auth.service.ts                # Authentication service
│   │   │   ├── schema.service.ts              # Form schema service
│   │   │   ├── validation.service.ts          # Validation engine service
│   │   │   ├── computation.service.ts         # Computation engine service
│   │   │   ├── reporting.service.ts           # Report generation service
│   │   │   ├── mapping.service.ts             # Event mapping service
│   │   │   ├── audit.service.ts               # Audit logging service
│   │   │   └── export.service.ts              # Data export service
│   │   │
│   │   ├── validators/
│   │   │   ├── index.ts
│   │   │   ├── common.validators.ts           # Common validation schemas
│   │   │   ├── form.validators.ts             # Form validation schemas
│   │   │   ├── financial.validators.ts        # Financial data validators
│   │   │   └── schema.validators.ts           # Schema definition validators
│   │   │
│   │   ├── constants/
│   │   │   ├── index.ts
│   │   │   ├── api.constants.ts               # API constants
│   │   │   ├── validation.constants.ts        # Validation constants
│   │   │   ├── computation.constants.ts       # Computation constants
│   │   │   └── reporting.constants.ts         # Reporting constants
│   │   │
│   │   ├── constants.ts                       # (existing - may need updating)
│   │   ├── types.ts                           # (existing - may need updating)
│   │   └── create-app.ts                      # (existing)
│   │
│   ├── middleware/
│   │   ├── index.ts
│   │   ├── auth.middleware.ts                 # JWT authentication middleware
│   │   ├── permission.middleware.ts           # Role-based access control
│   │   ├── validation.middleware.ts           # Request validation middleware
│   │   ├── rate-limit.middleware.ts           # Rate limiting middleware
│   │   ├── audit.middleware.ts                # Audit logging middleware
│   │   ├── error.middleware.ts                # Global error handling
│   │   ├── cache.middleware.ts                # Response caching middleware
│   │   └── cors.middleware.ts                 # CORS configuration
│   │
│   ├── app.ts                                 # (existing - needs updating)
│   ├── env.ts                                 # (existing)
│   └── index.ts                               # (existing)
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   └── middleware/
│   │
│   ├── integration/
│   │   ├── auth/
│   │   ├── schemas/
│   │   ├── planning/
│   │   ├── execution/
│   │   ├── reporting/
│   │   └── configurations/
│   │
│   └── fixtures/
│       ├── users.json
│       ├── projects.json
│       ├── form-schemas.json
│       ├── activities.json
│       └── financial-reports.json
│
├── docs/
│   ├── api/
│   │   ├── README.md
│   │   ├── authentication.md
│   │   ├── schema-engine.md
│   │   ├── planning-module.md
│   │   ├── execution-module.md
│   │   ├── reporting-module.md
│   │   └── configuration.md
│   │
│   ├── deployment/
│   │   ├── README.md
│   │   ├── environment-setup.md
│   │   ├── database-migration.md
│   │   └── production-checklist.md
│   │
│   └── development/
│       ├── README.md
│       ├── coding-standards.md
│       ├── testing-guidelines.md
│       └── contribution-guide.md
│
├── scripts/
│   ├── dev/
│   │   ├── setup-db.ts
│   │   ├── seed-data.ts
│   │   ├── reset-db.ts
│   │   └── generate-schemas.ts
│   │
│   ├── migration/
│   │   ├── migrate-legacy-data.ts
│   │   ├── validate-migration.ts
│   │   └── rollback-migration.ts
│   │
│   └── deployment/
│       ├── build.ts
│       ├── deploy.ts
│       └── health-check.ts
│
├── config/
│   ├── database.config.ts
│   ├── auth.config.ts
│   ├── redis.config.ts
│   ├── logging.config.ts
│   └── validation.config.ts
│
├── .env                                       # (existing)
├── .env.example
├── .env.test
├── .env.production
├── drizzle.config.ts                          # (existing)
├── pnpm-lock.yaml                             # (existing)
├── tsconfig.json                              # (existing)
├── jest.config.js
├── docker-compose.yml
├── Dockerfile
├── .gitignore
├── .prettierrc
├── .eslintrc.json
└── README.md
```