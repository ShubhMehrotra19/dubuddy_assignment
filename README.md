# 🚀 Auto-CRUD RBAC Platform

A powerful, dynamic backend platform that automatically generates RESTful CRUD APIs with granular role-based access control (RBAC) from simple JSON model definitions. No code generation, no manual route configuration—just define your data model and get fully functional, secure APIs instantly.

## 🎯 Problem Statement

Traditional backend development follows a repetitive cycle: define a model → create a database schema → write CRUD routes → implement authentication → add authorization → repeat for every model. This process is:

- **Time-consuming**: Hours of boilerplate for each model
- **Error-prone**: Inconsistent implementations across models
- **Inflexible**: Changes require code modifications and redeployment
- **Hard to scale**: Adding new models means writing more code

**What if you could define a model once and instantly get secure, production-ready APIs with fine-grained permissions?**

## 💡 Our Approach

<img width="1887" height="913" alt="Screenshot 2025-11-01 235851" src="https://github.com/user-attachments/assets/f8e5733b-2dab-4d21-9610-53e5dd3b0d85" />
<img width="1907" height="1686" alt="screencapture-localhost-3000-models-new-2025-11-02-00_01_05" src="https://github.com/user-attachments/assets/a5321184-6b57-4d37-ab1b-943d591594fa" />


We've built a **meta-framework** that turns model definitions into living, breathing APIs. Instead of writing code for each model, you define what you need in JSON, and the platform handles the rest—dynamically.

### Core Philosophy

1. **Zero Code Generation**: Models are JSON files, not code artifacts
2. **Dynamic Route Registration**: APIs come alive at runtime, not compile-time
3. **Granular RBAC**: Per-model, per-operation, per-role permissions with owner-based restrictions
4. **Self-Documenting**: Models are both configuration and documentation

## 🧠 Design Philosophy & Thoughtfulness

### 1. **Separation of Concerns**

We separated model definition from implementation:

- **Model Definition** (JSON): What the data looks like and who can access it
- **Route Generation** (Runtime): How the API behaves
- **Permission Checking** (Middleware): Who can do what

This allows models to evolve independently of the codebase.

### 2. **File-Based Model Storage**

Models are stored as JSON files (`backend/models/*.json`) rather than in code:

```typescript
// Instead of this (traditional approach):
class User {
  @Column()
  name: string;
  
  @ManyToOne()
  company: Company;
}

// We use this (declarative approach):
{
  "name": "User",
  "fields": [
    { "name": "name", "type": "string", "required": true },
    { "name": "companyId", "type": "string" }
  ],
  "rbac": {
    "Admin": ["all"],
    "Manager": ["create", "read", "update"],
    "Viewer": ["read"]
  }
}
```

**Why this matters:**
- Models can be version controlled independently
- No database migrations needed for model changes
- Models can be shared, exported, and imported
- Non-developers can modify models (with proper tooling)

### 3. **Runtime Route Registration**

Routes are registered dynamically when models are published:

```typescript
// backend/src/utils/routeRegistry.ts
export function registerModelRoutes(modelName: string) {
    if (!appInstance) {
        throw new Error('Route registry not initialized');
    }

    const modelNameLower = modelName.toLowerCase();

    if (registeredRoutes.has(modelNameLower)) {
        return;
    }

    appInstance.use(`/api/${modelNameLower}`, createCRUDRoutes(modelName));
    registeredRoutes.add(modelNameLower);
    console.log(`Registered CRUD routes for model: ${modelName}`);
}
```

**The magic:** When you publish a model called "Employee", routes are instantly available at `/api/employee` without restarting the server.

### 4. **Owner-Based Access Control**

Beyond role-based permissions, we support ownership-based restrictions:

```typescript
// backend/src/utils/rbac.ts
export function checkPermission(
    req: AuthRequest,
    model: ModelDefinition,
    permission: Permission,
    record?: any
): boolean {
    if (!req.user) return false;

    const role = req.user.role;
    const permissions = model.rbac[role] || [];
    if (permissions.includes('all')) {
        return true;
    }

    if (permissions.includes(permission)) {
        if ((permission === 'update' || permission === 'delete') && model.ownerField) {
            if (!record) return true; 
            return record[model.ownerField] === req.user.userId;
        }
        return true;
    }

    return false;
}
```

**Real-world example:** A "Document" model with `ownerField: "createdBy"` means:
- Admins can update/delete any document
- Managers can only update/delete documents they created
- Viewers can read all documents but can't modify any

### 5. **Dual Storage Strategy**

Models are stored both as files and in the database:

```typescript
// backend/src/services/modelService.ts
export async function saveModelDefinition(model: ModelDefinition): Promise<void> {
    await ensureModelsDirectory();
    const filePath = path.join(MODELS_DIR, `${model.name}.json`);
    await fs.writeFile(filePath, JSON.stringify(model, null, 2), 'utf-8');

    await prisma.modelDefinition.upsert({
        where: { name: model.name },
        update: {
            tableName: model.tableName,
            definition: model as any,
        },
        create: {
            name: model.name,
            tableName: model.tableName,
            definition: model as any,
        },
    });
}
```

**Why both?**
- **Files**: Easy to edit, version control, share, backup
- **Database**: Fast queries, metadata tracking, relationship modeling

## 🔍 Thinking Process

### Challenge 1: Dynamic Schema Generation

**Problem:** How do we create database tables from JSON definitions at runtime?

**Solution:** We generate SQL dynamically:

```typescript
export async function createTableForModel(model: ModelDefinition): Promise<void> {
    const tableName = model.tableName || `${model.name.toLowerCase()}s`;
    let sql = `CREATE TABLE IF NOT EXISTS "${tableName}" (`;
    sql += `"id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,`;
    
    if (model.ownerField) {
        sql += `"${model.ownerField}" TEXT,`;
    }
    
    for (const field of model.fields) {
        let columnDef = `"${field.name}" `;
        switch (field.type) {
            case 'string': columnDef += 'TEXT'; break;
            case 'number': columnDef += 'NUMERIC'; break;
            case 'boolean': columnDef += 'BOOLEAN'; break;
            case 'date': columnDef += 'TIMESTAMP'; break;
            case 'json': columnDef += 'JSONB'; break;
        }
        if (field.required) columnDef += ' NOT NULL';
        if (field.default !== undefined) {
            columnDef += ` DEFAULT ${formatDefault(field.default)}`;
        }
        if (field.unique) columnDef += ' UNIQUE';
        sql += columnDef + ',';
    }
    
    sql += `"createdAt" TIMESTAMP DEFAULT NOW(),`;
    sql += `"updatedAt" TIMESTAMP DEFAULT NOW()`;
    sql += ')';
    
    await prisma.$executeRawUnsafe(sql);
}
```

### Challenge 2: Generic CRUD Routes

**Problem:** How do we write routes that work for any model?

**Solution:** Higher-order route factory that closes over the model name:

```typescript
export function createCRUDRoutes(modelName: string) {
    const modelRouter = express.Router();
    
    modelRouter.get('/', authenticate, async (req: AuthRequest, res) => {
        const model = await loadModelDefinition(modelName);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }
        
        if (!checkPermission(req, model, 'read')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        const tableName = model.tableName || `${model.name.toLowerCase()}s`;
        const records = await prisma.$queryRawUnsafe(
            `SELECT * FROM "${tableName}" ORDER BY "createdAt" DESC`
        );
        
        res.json(records);
    });
    
    // ... POST, PUT, DELETE routes follow the same pattern
    
    return modelRouter;
}
```

The function returns a router configured for a specific model, but the logic is completely generic.

### Challenge 3: Permission Granularity

**Problem:** How do we support complex permission scenarios (role-based + owner-based)?

**Solution:** Multi-layered permission checking:

1. **Role check**: Does the user's role have this permission?
2. **Owner check**: If the operation is update/delete and an ownerField exists, is the user the owner?
3. **Admin override**: Users with 'all' permission bypass owner checks

This gives us:
- **Role-level permissions**: "Managers can create"
- **Record-level permissions**: "Managers can only update their own records"
- **Escalation**: "Admins can do everything"

## 🎨 Unique Code Snippets

### 1. **Dynamic Route Factory Pattern**

Instead of hardcoding routes, we generate them:

```typescript
// When a model "Product" is published, this automatically creates:
// GET    /api/product
// GET    /api/product/:id
// POST   /api/product
// PUT    /api/product/:id
// DELETE /api/product/:id

export function createCRUDRoutes(modelName: string) {
    const modelRouter = express.Router();
    // ... route handlers
    return modelRouter;
}

// Registration happens at runtime:
registerModelRoutes('Product'); // Routes are now live!
```

### 2. **Type-Safe Model Definition with RBAC**

Our model definition is both type-safe and flexible:

```typescript
interface ModelDefinition {
    name: string;
    tableName?: string;
    fields: ModelField[];
    ownerField?: string;
    rbac: ModelRBAC; // { [role: string]: Permission[] }
}

// Example:
{
    "name": "Invoice",
    "ownerField": "createdBy",
    "rbac": {
        "Admin": ["all"],
        "Accountant": ["create", "read", "update"],
        "Client": ["read"]
    }
}
```

This ensures Accountants can only modify invoices they created, while Admins have full access.

### 3. **Self-Healing Model Loading**

Models are loaded from files with graceful fallbacks:

```typescript
export async function loadModelDefinition(modelName: string): Promise<ModelDefinition | null> {
    try {
        const filePath = path.join(MODELS_DIR, `${modelName}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return null; // Model doesn't exist yet
    }
}
```

If a model file is missing, the API returns 404 rather than crashing.

### 4. **Owner Field Auto-Population**

When creating records, owner fields are automatically set:

```typescript
modelRouter.post('/', authenticate, async (req: AuthRequest, res) => {
    // ... permission checks ...
    
    if (model.ownerField && req.user) {
        data[model.ownerField] = req.user.userId;
    }
    
    // ... insert into database ...
});
```

Users can't accidentally (or intentionally) create records owned by someone else.

## 🚀 How to Run the App

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- Git

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd dubuddy_assignment

# Install root dependencies (if any)
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Database Setup

```bash
# Create PostgreSQL database
createdb auto_crud_db

# Or using psql:
psql -U postgres
CREATE DATABASE auto_crud_db;
\q
```

### Step 3: Configure Environment

```bash
cd backend
cp .env.example .env  # Create .env if it doesn't exist
```

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/auto_crud_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=3001
```

### Step 4: Run Database Migrations

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

### Step 5: Create Models Directory

```bash
mkdir -p backend/models
```

### Step 6: Start the Application

**Option A: Run both servers (recommended)**

From the project root:

```bash
npm run dev
```

**Option B: Run separately**

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

### Step 7: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### Step 8: Create Your First Admin User

1. Navigate to http://localhost:3000
2. Click "Register"
3. Fill in email, password, and set role to "Admin"
4. You'll be automatically logged in

## 📝 How to Create & Publish a Model

### Method 1: Using the Web UI (Recommended)

1. **Navigate to Dashboard**: After logging in as Admin, you'll see the model dashboard

2. **Click "Create New Model"**

3. **Fill in Model Details**:
   - **Name**: e.g., "Product", "Employee", "Invoice"
   - **Table Name** (optional): Custom database table name (defaults to lowercase model name + 's')

4. **Add Fields**:
   - Click "Add Field"
   - Set field properties:
     - **Name**: Field identifier (e.g., "name", "email", "price")
     - **Type**: string, number, boolean, date, or json
     - **Required**: Whether the field must have a value
     - **Unique**: Whether values must be unique across records
     - **Default**: Default value (optional)

5. **Configure Owner Field** (optional):
   - Set "Owner Field" if records should have ownership
   - Example: Set to "createdBy" to track who created each record

6. **Set RBAC Permissions**:
   - For each role (Admin, Manager, Viewer), select permissions:
     - **All**: Full access (Admin typically has this)
     - **Create**: Can create new records
     - **Read**: Can view records
     - **Update**: Can modify records (subject to owner restrictions)
     - **Delete**: Can remove records (subject to owner restrictions)

7. **Save Model**: Click "Save Model" - this stores the model definition

8. **Publish Model**: Click "Publish" on the model card
   - This creates the database table
   - Registers the CRUD routes at `/api/<modelname>`
   - Model is now ready to use!

### Method 2: Manual JSON Creation

1. **Create Model File**: Create `backend/models/YourModel.json`:

```json
{
  "name": "Product",
  "tableName": "products",
  "fields": [
    {
      "name": "name",
      "type": "string",
      "required": true
    },
    {
      "name": "price",
      "type": "number",
      "required": true
    },
    {
      "name": "description",
      "type": "string"
    },
    {
      "name": "inStock",
      "type": "boolean",
      "default": true
    }
  ],
  "ownerField": "createdBy",
  "rbac": {
    "Admin": ["all"],
    "Manager": ["create", "read", "update"],
    "Viewer": ["read"]
  }
}
```

2. **Use the API to Publish**:

```bash
# First, save via API (or it will be auto-saved when you publish)
curl -X POST http://localhost:3001/api/models \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @backend/models/Product.json

# Then publish
curl -X POST http://localhost:3001/api/models/Product/publish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example Model: Employee Management System

```json
{
  "name": "Employee",
  "fields": [
    { "name": "firstName", "type": "string", "required": true },
    { "name": "lastName", "type": "string", "required": true },
    { "name": "email", "type": "string", "required": true, "unique": true },
    { "name": "department", "type": "string", "required": true },
    { "name": "salary", "type": "number" },
    { "name": "hireDate", "type": "date", "required": true },
    { "name": "active", "type": "boolean", "default": true }
  ],
  "ownerField": "hrRepId",
  "rbac": {
    "Admin": ["all"],
    "HRManager": ["create", "read", "update"],
    "Manager": ["read", "update"],
    "Viewer": ["read"]
  }
}
```

After publishing, you can:
- **List employees**: `GET /api/employee`
- **Get employee**: `GET /api/employee/:id`
- **Create employee**: `POST /api/employee` (HRManager+ only, auto-sets hrRepId)
- **Update employee**: `PUT /api/employee/:id` (Managers can only update their own records)
- **Delete employee**: `DELETE /api/employee/:id` (Admin only)

## 💾 How File-Write Works

Models are persisted using a **dual storage strategy** for reliability and performance:

### Storage Mechanism

```typescript
// backend/src/services/modelService.ts
export async function saveModelDefinition(model: ModelDefinition): Promise<void> {
    // 1. Ensure models directory exists
    await ensureModelsDirectory();
    
    // 2. Write to file system
    const filePath = path.join(MODELS_DIR, `${model.name}.json`);
    await fs.writeFile(
        filePath, 
        JSON.stringify(model, null, 2),  // Pretty-printed JSON
        'utf-8'
    );

    // 3. Store metadata in database
    await prisma.modelDefinition.upsert({
        where: { name: model.name },
        update: {
            tableName: model.tableName,
            definition: model as any,
        },
        create: {
            name: model.name,
            tableName: model.tableName,
            definition: model as any,
        },
    });
}
```

### Why Two Storage Systems?

1. **File System (JSON files)**:
   - ✅ Human-readable and editable
   - ✅ Easy to version control (Git)
   - ✅ Portable and shareable
   - ✅ No database dependency for model definitions
   - ✅ Easy backups (just copy the directory)

2. **Database (Prisma)**:
   - ✅ Fast queries for model metadata
   - ✅ Can track model relationships
   - ✅ Audit trail of model changes
   - ✅ Can build admin interfaces on top

### File Structure

```
backend/
└── models/
    ├── Product.json
    ├── Employee.json
    ├── Invoice.json
    └── ...
```

Each file is a complete, self-contained model definition:

```json
{
  "name": "Product",
  "tableName": "products",
  "fields": [...],
  "ownerField": "createdBy",
  "rbac": {...}
}
```

### Loading Models

When a model is needed (e.g., for route handling), it's loaded from the file system:

```typescript
export async function loadModelDefinition(modelName: string): Promise<ModelDefinition | null> {
    try {
        const filePath = path.join(MODELS_DIR, `${modelName}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return null; // Model doesn't exist
    }
}
```

**Benefits:**
- Models are always up-to-date (no caching issues)
- Changes to model files are immediately reflected
- Models can be edited directly in the file system for advanced use cases

## 🔄 How Dynamic CRUD Endpoints Are Registered

The platform's most powerful feature is **runtime route registration**. Here's how it works:

### The Registration Flow

```
1. Model Definition Created → 2. Model Saved → 3. Model Published → 4. Routes Registered
```

### Step-by-Step Process

#### Step 1: Initialize Route Registry

When the server starts:

```typescript
// backend/src/index.ts
import { initializeRouteRegistry, registerModelRoutes } from './utils/routeRegistry';

const app = express();
initializeRouteRegistry(app); // Store app instance for later use

// Register routes for existing models on startup
async function registerCRUDRoutes() {
    const models = await listModelDefinitions();
    for (const model of models) {
        registerModelRoutes(model.name);
    }
}
registerCRUDRoutes().catch(console.error);
```

#### Step 2: Route Factory Pattern

When a model is published, routes are created dynamically:

```typescript
// backend/src/routes/crudRoutes.ts
export function createCRUDRoutes(modelName: string) {
    const modelRouter = express.Router();
    
    // GET /api/:modelName - List all records
    modelRouter.get('/', authenticate, async (req: AuthRequest, res) => {
        const model = await loadModelDefinition(modelName);
        if (!checkPermission(req, model, 'read')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        // ... fetch and return records
    });
    
    // GET /api/:modelName/:id - Get single record
    modelRouter.get('/:id', authenticate, async (req: AuthRequest, res) => {
        // ... implementation
    });
    
    // POST /api/:modelName - Create record
    modelRouter.post('/', authenticate, async (req: AuthRequest, res) => {
        // ... implementation with owner field auto-population
    });
    
    // PUT /api/:modelName/:id - Update record
    modelRouter.put('/:id', authenticate, async (req: AuthRequest, res) => {
        // ... implementation with owner-based permission checking
    });
    
    // DELETE /api/:modelName/:id - Delete record
    modelRouter.delete('/:id', authenticate, async (req: AuthRequest, res) => {
        // ... implementation
    });
    
    return modelRouter; // Return configured router
}
```

**Key insight**: The `modelName` parameter is "closed over" by the route handlers, making each router instance specific to one model.

#### Step 3: Registration

When a model is published:

```typescript
// backend/src/utils/routeRegistry.ts
const registeredRoutes = new Set<string>();
let appInstance: express.Application | null = null;

export function initializeRouteRegistry(app: express.Application) {
    appInstance = app;
}

export function registerModelRoutes(modelName: string) {
    if (!appInstance) {
        throw new Error('Route registry not initialized');
    }

    const modelNameLower = modelName.toLowerCase();
    
    // Prevent duplicate registrations
    if (registeredRoutes.has(modelNameLower)) {
        return;
    }

    // Create routes for this model
    const router = createCRUDRoutes(modelName);
    
    // Mount router at /api/:modelName
    appInstance.use(`/api/${modelNameLower}`, router);
    
    // Track registration
    registeredRoutes.add(modelNameLower);
    console.log(`Registered CRUD routes for model: ${modelName}`);
}
```

#### Step 4: Route Activation

When you publish "Employee" model:

```typescript
// backend/src/routes/modelRoutes.ts
router.post('/:modelName/publish', authenticate, requireRole('Admin'), async (req, res) => {
    const model = await loadModelDefinition(req.params.modelName);
    
    // Create database table
    await createTableForModel(model);
    
    // Register routes - THIS IS THE MAGIC!
    registerModelRoutes(model.name);
    
    res.json({ message: 'Model published successfully', model });
});
```

**Result**: Routes are immediately available:
- `GET /api/employee` - List all employees
- `GET /api/employee/:id` - Get specific employee
- `POST /api/employee` - Create employee
- `PUT /api/employee/:id` - Update employee
- `DELETE /api/employee/:id` - Delete employee

### Visual Flow

```
┌─────────────────┐
│  Model Defined  │
│  (JSON file)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Model Saved    │
│  (File + DB)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Model Published│
│  (Admin action) │
└────────┬────────┘
         │
         ├──► Create DB Table
         │
         └──► registerModelRoutes()
                    │
                    ▼
         ┌──────────────────────┐
         │  createCRUDRoutes()   │
         │  Returns Router       │
         └──────────┬────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  app.use('/api/...')  │
         │  Mount Router        │
         └──────────┬────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Routes Live! ✅     │
         │  No restart needed   │
         └──────────────────────┘
```

### Advanced: Route Registry Features

```typescript
// Check if routes are registered
export function isRouteRegistered(modelName: string): boolean {
    return registeredRoutes.has(modelName.toLowerCase());
}

// List all registered routes
export function getRegisteredRoutes(): string[] {
    return Array.from(registeredRoutes);
}
```

This enables introspection and debugging capabilities.

### Why This Approach is Powerful

1. **Zero Restart**: Routes become available immediately
2. **Memory Efficient**: Routes are created only when needed
3. **Type Safe**: Model definitions are validated before registration
4. **Scalable**: Add hundreds of models without code changes
5. **Testable**: Each route factory is independently testable

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Dashboard│  │  Model    │  │  Records │             │
│  │          │  │  Editor   │  │  Manager │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ HTTP/REST
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend (Express)                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Route Registry                         │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │ /api/user  │  │ /api/product│ │ /api/invoice│ │  │
│  │  │ (dynamic) │  │  (dynamic)  │ │  (dynamic) │ │  │
│  │  └────────────┘  └────────────┘  └────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Auth Routes  │  │ Model Routes │  │  RBAC Utils  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │  Models  │  │ Prisma   │  │   JWT    │
    │  (JSON)  │  │   ORM    │  │   Auth   │
    └──────────┘  └──────────┘  └──────────┘
                       │
                       ▼
              ┌──────────────┐
              │  PostgreSQL  │
              └──────────────┘
```

## 🧪 Testing

The project includes comprehensive test coverage for both dynamic APIs and RBAC:

```bash
cd backend
npm test
```

Test suites:
- **RBAC Tests**: Permission checking for all roles and scenarios
- **CRUD Route Tests**: Dynamic endpoint generation and behavior
- **Owner Field Tests**: Ownership-based access restrictions

## 📚 Technology Stack

- **Backend**: Node.js, Express.js, TypeScript, Prisma
- **Frontend**: React, TypeScript, Vite
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Testing**: Jest, Supertest

## 🎯 Use Cases

- **Rapid Prototyping**: Define models and get APIs instantly
- **Internal Tools**: Quick CRUD interfaces for business operations
- **Multi-Tenant SaaS**: Per-tenant model customization
- **Content Management**: Dynamic content types
- **Admin Panels**: Flexible backend for custom admin interfaces

**Built with ❤️ using dynamic route generation and thoughtful architectural patterns.**

