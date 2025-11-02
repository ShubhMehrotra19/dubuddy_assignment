# Quick Setup Guide

Follow these steps to get the platform running:

## 1. Install Dependencies

```bash
# From project root
npm run install:all
```

Or manually:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

## 2. Setup Database

1. Make sure PostgreSQL is running
2. Create a database:
```sql
CREATE DATABASE auto_crud_db;
```

3. Copy environment file:
```bash
cd backend
cp .env.example .env
```

4. Edit `backend/.env` with your database credentials:
```
DATABASE_URL="postgresql://username:password@localhost:5432/auto_crud_db?schema=public"
JWT_SECRET="your-secret-key-here"
PORT=3001
```

5. Run Prisma migrations:
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

## 3. Create Models Directory

```bash
mkdir -p backend/models
```

## 4. Start Servers

**Option 1: Run both servers together**
```bash
npm run dev
```

**Option 2: Run separately**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

## 5. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## 6. Create First Admin User

1. Go to http://localhost:3000/login
2. Click "Don't have an account? Register"
3. Create an account with role "Admin"
4. You'll be automatically logged in

## 7. Create Your First Model

1. Click "Create New Model"
2. Fill in model details:
   - Name: e.g., "Employee"
   - Add fields (name, email, age, etc.)
   - Configure RBAC permissions
3. Click "Save Model"
4. Click "Publish" on the model card to create the database table and register routes

## Next Steps

- Create more models via the UI
- Manage records for each model
- Test RBAC by creating users with different roles
- Check out the example models in `backend/models/*.example.json`

## Troubleshooting

- **Database connection error**: Verify PostgreSQL is running and DATABASE_URL is correct
- **Routes not working**: Make sure to publish models after creating them
- **Permission denied**: Check user role and model RBAC settings
- **Port already in use**: Change PORT in backend/.env

