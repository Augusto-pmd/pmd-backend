# PMD Management System - Backend

Complete backend implementation for the PMD Management System using NestJS, TypeORM, and PostgreSQL.

## 🚀 Features

- **Authentication & Authorization:** JWT-based authentication with role-based access control (RBAC)
- **User Management:** Complete user and role management system
- **Work Management:** Project/Work tracking with budgets, contracts, and Gantt charts
- **Expense Management:** Expense tracking with validation workflow and automatic VAL generation
- **Supplier Management:** Supplier approval, document management, and ART expiration tracking
- **Cashbox Management:** Cashbox tracking with refills, difference approval, and detailed history
- **Accounting:** Accounting records with month closing, automatic tax calculations, and comprehensive reports
- **Alerts System:** Automated alert generation with assignment and resolution workflow
- **Schedule Management:** Automatic Gantt chart generation and work progress tracking (physical, economic, financial)
- **Exchange Rates:** Currency exchange rate management for multi-currency operations
- **Offline Mode:** Offline item storage and synchronization for mobile/work in the field
- **Backup System:** Automated database backups with scheduled jobs (daily full, incremental, weekly cleanup)
- **Audit Logging:** Complete audit trail with detailed change tracking
- **Security Features:** CSRF protection, brute force prevention, XSS sanitization
- **API Documentation:** Comprehensive Swagger/OpenAPI documentation

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TU-USUARIO/pmd-system.git
   cd pmd-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env
   ```
   Edit `.env` with your database credentials and JWT secret.

4. **Run database migrations**
   ```bash
   npm run migration:run
   ```

5. **Seed the database (optional)**
   ```bash
   npm run seed
   ```

## 🏃 Running the Application

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

## 📚 API Documentation

Once the application is running, access Swagger documentation at:
- **Development:** http://localhost:5000/api/docs
- **Production:** https://your-domain.com/api/docs

The Swagger documentation includes:
- Complete API reference for all endpoints
- Authentication details (JWT Bearer token)
- Request/response schemas
- Example requests and responses
- Role-based permissions for each endpoint

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:e2e
```

### Test Coverage
```bash
npm run test:cov
```

## 📁 Project Structure

```
src/
├── auth/              # Authentication module
├── users/             # User management
├── roles/              # Role management
├── suppliers/         # Supplier management
├── supplier-documents/# Supplier document management
├── works/             # Work/Project management
├── work-budgets/      # Work budget management
├── work-documents/    # Work document management
├── contracts/         # Contract management
├── rubrics/           # Rubric/Category management
├── expenses/          # Expense management
├── val/               # VAL document management
├── incomes/           # Income management
├── cashboxes/         # Cashbox management
├── cash-movements/    # Cash movement tracking
├── schedule/          # Schedule/Gantt management
├── accounting/        # Accounting records and reports
├── alerts/            # Alert system with assignment/resolution
├── audit/             # Audit logging
├── exchange-rates/    # Exchange rate management
├── offline/           # Offline mode and synchronization
├── backup/            # Database backup management
├── storage/           # File storage (Google Drive/Dropbox)
├── dashboard/         # Dashboard data
├── tasks/             # Scheduled tasks
├── common/            # Shared utilities, guards, interceptors
├── config/            # Configuration
└── migrations/        # Database migrations
```

## 🔐 Default Users (from seed)

| Email | Role | Password |
|-------|------|----------|
| direction@pmd.com | Direction | password123 |
| supervisor@pmd.com | Supervisor | password123 |
| admin@pmd.com | Administration | password123 |
| operator@pmd.com | Operator | password123 |
| operator2@pmd.com | Operator | password123 |

⚠️ **Change these passwords in production!**

## 📖 Documentation

- [User Guide](USER_GUIDE.md) - Complete user guide for all system features
- [Seeding Guide](SEEDING_GUIDE.md) - Database seeding instructions
- [Permissions Mapping](PERMISSIONS_MAPPING.md) - Role permissions documentation
- [Build Validation](BUILD_VALIDATION_SUMMARY.md) - Build status and validation
- [Integration Tests](test/integration/README.md) - E2E test documentation
- [Unit Tests](UNIT_TESTS_IMPLEMENTATION.md) - Unit test documentation
- [Swagger Documentation](SWAGGER_DOCUMENTATION.md) - API documentation status and guidelines

## 🗄️ Database

The system uses PostgreSQL with TypeORM. Migrations are located in `src/migrations/`.

### Run Migrations
```bash
npm run migration:run
```

### Generate Migration
```bash
npm run migration:generate -- -n MigrationName
```

## 🔧 Environment Variables

See `env.example` for all required environment variables.

### Production (Render)
**REQUIRED:** Set `DATABASE_URL` in Render environment variables:
```
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

The system will automatically:
- Parse `DATABASE_URL` for connection details
- Enable SSL for secure connections
- Configure retry logic for production

### Development (Local)
Use individual variables or `.env.development`:
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_USERNAME` - Database username (default: postgres)
- `DB_PASSWORD` - Database password (default: postgres)
- `DB_DATABASE` - Database name (default: pmd_management)

### Other Variables
- `JWT_SECRET` - JWT secret key
- `JWT_EXPIRATION` - JWT expiration time (default: 1d)
- `PORT` - Application port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## 📝 License

UNLICENSED

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Built with:** NestJS, TypeORM, PostgreSQL, TypeScript
