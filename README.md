# PMD Management System - Backend

Complete backend implementation for the PMD Management System using NestJS, TypeORM, and PostgreSQL.

## 🚀 Features

- **Authentication & Authorization:** JWT-based authentication with role-based access control (RBAC)
- **User Management:** Complete user and role management system
- **Work Management:** Project/Work tracking with budgets and contracts
- **Expense Management:** Expense tracking with validation workflow
- **Supplier Management:** Supplier approval and document management
- **Cashbox Management:** Cashbox tracking with difference approval
- **Accounting:** Accounting records with month closing
- **Alerts System:** Automated alert generation
- **Audit Logging:** Complete audit trail
- **API Documentation:** Swagger/OpenAPI documentation

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
- **URL:** http://localhost:3000/api/docs

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
├── works/             # Work/Project management
├── expenses/          # Expense management
├── cashboxes/         # Cashbox management
├── accounting/        # Accounting records
├── alerts/            # Alert system
├── audit/             # Audit logging
├── common/            # Shared utilities
├── config/            # Configuration
└── migrations/        # Database migrations
```

## 🔐 Default Users (from seed)

| Email | Role | Password |
|-------|------|----------|
| direction@pmd.com | Direction | password123 |
| supervisor@pmd.com | Supervisor | password123 |
| admin@pmd.com | Administration | password123 |
| operator1@pmd.com | Operator | password123 |
| operator2@pmd.com | Operator | password123 |

⚠️ **Change these passwords in production!**

## 📖 Documentation

- [Seeding Guide](SEEDING_GUIDE.md) - Database seeding instructions
- [Permissions Mapping](PERMISSIONS_MAPPING.md) - Role permissions documentation
- [Build Validation](BUILD_VALIDATION_SUMMARY.md) - Build status and validation
- [Integration Tests](test/integration/README.md) - E2E test documentation
- [Unit Tests](UNIT_TESTS_IMPLEMENTATION.md) - Unit test documentation

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

Key variables:
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `DB_DATABASE` - Database name
- `JWT_SECRET` - JWT secret key
- `JWT_EXPIRATION` - JWT expiration time

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
