# Test Suite for Dynamic APIs and RBAC

This directory contains comprehensive automated tests for the dynamic API CRUD endpoints and RBAC (Role-Based Access Control) functionality.

## Test Coverage

### 1. RBAC Permission Tests (`rbac.test.ts`)
- Permission checks for different roles (Admin, Manager, Viewer)
- Owner field restrictions for update/delete operations
- Edge cases (unauthenticated users, missing permissions, etc.)
- Complex RBAC scenarios with custom roles

### 2. Dynamic API CRUD Tests (`crudRoutes.test.ts`)
- **GET** endpoints (list all, get single record)
- **POST** endpoints (create records)
- **PUT** endpoints (update records)
- **DELETE** endpoints (delete records)
- Permission-based access control for all operations
- Owner field validation
- Error handling (404, 403, 500)
- Table name resolution (custom vs default)

## Running Tests

### Install Dependencies
```bash
cd backend
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test -- rbac.test.ts
npm test -- crudRoutes.test.ts
```

## Test Structure

Tests use Jest with the following mocking strategy:
- **Prisma Client**: Mocked to avoid database dependencies
- **Authentication Middleware**: Mocked with default test user
- **Model Service**: Mocked to return test model definitions
- **RBAC Utils**: Mocked for permission checking

## Test Scenarios Covered

### Role-Based Permissions
- ✅ Admin: Full access (all operations)
- ✅ Manager: Create, read, update (no delete)
- ✅ Viewer: Read-only access

### Owner Field Restrictions
- ✅ Users can only update/delete records they own
- ✅ Admins can update/delete any record
- ✅ Create operation sets owner field automatically

### API Endpoints
- ✅ GET `/api/:modelName` - List all records
- ✅ GET `/api/:modelName/:id` - Get single record
- ✅ POST `/api/:modelName` - Create record
- ✅ PUT `/api/:modelName/:id` - Update record
- ✅ DELETE `/api/:modelName/:id` - Delete record

## Notes

- Tests run in isolation with mocked dependencies
- No actual database connection required
- Authentication is automatically handled by mocks
- All test data is generated per test case

