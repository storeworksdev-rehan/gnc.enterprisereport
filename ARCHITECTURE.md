# GNC Enterprise Report — Tech Stack Architecture

> Generated: April 2026
> Projects: `gnc.enterprisereport` (Client) · `Xenia.ITData.API` (Server) · Azure Synapse (Data)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GNC ENTERPRISE REPORT                              │
│                        Business Intelligence Platform                        │
└─────────────────────────────────────────────────────────────────────────────┘

         ┌──────────────────┐        ┌──────────────────┐       ┌─────────────────────┐
         │   BROWSER / USER  │        │   ASP.NET CORE   │       │   AZURE SYNAPSE     │
         │                  │        │      5.0 API      │       │   DEDICATED POOL    │
         │  Next.js 16      │◄──────►│                  │◄─────►│                     │
         │  React 19        │  REST  │  Xenia.ITData    │  ADO  │  daisoitsqlpooltest │
         │  TypeScript      │  JSON  │  .API            │  .NET │                     │
         │  Tailwind CSS 4  │        │                  │       │  Stored Procedures  │
         └──────────────────┘        └──────────────────┘       └─────────────────────┘
              Port 3000                  Port 44358                  Port 1433
           (localhost dev)            (localhost dev)          (daisosynapsetest
                                                               .sql.azuresynapse.net)
```

---

## 1. CLIENT — Frontend

**Path:** `C:\Users\StoreworksDev01\Documents\gnc.enterprisereport`

### Core Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | **Next.js** | 16.2.2 |
| UI Library | **React** | 19.2.4 |
| Language | **TypeScript** | 5.x |
| Styling | **Tailwind CSS** | 4.0 |
| HTTP Client | **Axios** | 1.14.0 |
| Charts | **Recharts** | 3.8.1 |
| Icons | **Lucide React** | 1.7.0 |

### Folder Structure

```
gnc.enterprisereport/
│
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, global styles)
│   ├── page.tsx                  # Login page (entry point)
│   ├── not-found.tsx             # 404 page
│   └── dashboard/
│       ├── layout.tsx            # Dashboard shell (Header + Sidebar)
│       └── page.tsx              # KPI dashboard view
│
├── components/
│   ├── Header.tsx                # Top navigation bar
│   ├── Sidebar.tsx               # Left navigation sidebar
│   ├── DealAnalytics.tsx         # Deal charts & analytics (~22KB)
│   └── SalesAnalyticsModal.tsx   # Sales detail modal (~23KB)
│
├── public/                       # Static assets (logos, images)
├── next.config.ts                # API proxy rewrite rules
├── tsconfig.json                 # TypeScript config
├── postcss.config.mjs            # Tailwind PostCSS
└── package.json
```

### Page / Route Map

```
/                   → Login Page
                        POST /api/auth/login
                        └── stores token + user in localStorage

/dashboard          → Main Dashboard
                        ├── KPI Cards
                        ├── DealAnalytics (charts)
                        └── SalesAnalyticsModal (detail view)
```

### Authentication Flow (Client Side)

```
User enters credentials
        │
        ▼
POST /api/auth/login
        │
        ▼
Response: { UserId, Username, RoleId, RoleName,
            SessionToken, PagePermissions, Features }
        │
        ├──► localStorage["enterprise_auth_token"] = SessionToken
        └──► localStorage["enterprise_user"]       = JSON.stringify(user)
        │
        ▼
Redirect → /dashboard
```

### API Proxy Config (`next.config.ts`)

```typescript
// All /api/* calls proxied to backend
rewrites: [{ source: '/api/:path*',
             destination: `${NEXT_PUBLIC_SERVER_API}/api/:path*` }]

// Environment variable
NEXT_PUBLIC_SERVER_API = http://localhost:4000   // dev default
                       = https://your-api.com    // production
```

---

## 2. SERVER — Backend API

**Path:** `D:\store-works-projects\SideProject\SW.ITDashboard.WebAPI\Xenia.ITData.API\WebApplication`

### Core Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | **ASP.NET Core** | 5.0 |
| Language | **C#** | 9.0 |
| DB Client | **Microsoft.Data.SqlClient** | 5.2.0 |
| API Docs | **Swagger / Swashbuckle** | 6.3.1 |
| Pattern | **ADO.NET + Stored Procedures** | — |
| Auth | **SHA256 + Session Token** | — |

### Folder Structure

```
WebApplication/
│
├── Controllers/
│   ├── AuthController.cs          # Users, Roles, Login
│   ├── ITDashboardController.cs   # Main dashboard data (~38KB)
│   ├── TranController.cs          # Sales / transaction data
│   └── ITCentralServer.cs         # Server/infrastructure info
│
├── Models/
│   ├── AuthReq.cs                 # UserModel, LoginRequest, CreateRoleModel
│   ├── StoresCases.cs             # Store domain models (~10KB)
│   ├── Dto/
│   │   ├── CS_VertexDto.cs
│   │   ├── ExceptionTrendDto.cs
│   │   └── ExceptionTrendRequestDto.cs
│   └── [20+ model files]          # APIData, MetricData, etc.
│
├── ResourceAccess/
│   ├── AuthResource.cs            # Auth DB calls (~19KB)
│   ├── ITDashboardResourceAccess.cs  # Dashboard queries (~132KB)
│   └── TranResource.cs            # Transaction queries (~6KB)
│
├── Program.cs                     # Host builder
├── Startup.cs                     # Middleware + DI config
├── appsettings.json               # Connection string + logging
└── Xenia.ITData.API.csproj
```

### API Endpoints

```
AUTH ──────────────────────────────────────────────────────
POST   /api/auth/login                  Login → returns UserModel + Token
POST   /api/auth/create-user            Create new user
POST   /api/auth/update-user            Update user
DELETE /api/auth/delete-user/{userId}   Delete user
GET    /api/auth/get-users              List all users
GET    /api/auth/get-roles              List all roles
POST   /api/auth/create-role            Create role + page/feature permissions
POST   /api/auth/update-role            Update role + permissions
POST   /api/auth/change-password        Admin change password
POST   /api/auth/change-user-password   User change own password

TRANSACTIONS ──────────────────────────────────────────────
GET    /api/tran/getTranSalesData        ?LocationId=&FromDate=&ToDate=
GET    /api/tran/getDealReportData       ?LocationId=&FromDate=&ToDate=

IT DASHBOARD ──────────────────────────────────────────────
       /api/itdashboard/*               (KPI, exception trends, server metrics)

IT CENTRAL SERVER ─────────────────────────────────────────
       /api/itcentralserver/*           (Infrastructure, version info)
```

### Authentication Flow (Server Side)

```
POST /api/auth/login
{ Username, Password }
        │
        ▼
AuthResource.cs
  └── SELECT user from Synapse by Username
        │
        ▼
SHA256(password) == stored hash?
        │
    YES │              NO
        ▼               ▼
  Return UserModel    401 Unauthorized
  {
    UserId
    Username
    RoleId
    RoleName
    SessionToken       ← GUID-based token
    PagePermissions    ← JSON string from DB
    Features           ← JSON string from DB
  }
```

### Data Access Pattern

```csharp
// Pattern used across all ResourceAccess classes
SqlConnection conn = new SqlConnection(connectionString);
SqlCommand    cmd  = new SqlCommand("IT.StoredProcedureName", conn);
cmd.CommandType = CommandType.StoredProcedure;
cmd.Parameters.AddWithValue("@Param", value);

SqlDataAdapter da = new SqlDataAdapter(cmd);
DataSet ds = new DataSet();
da.Fill(ds);

// Convert to List<Dictionary<string,object>> for JSON response
```

---

## 3. DATABASE — Azure Synapse Analytics

**Server:** `daisosynapsetest.sql.azuresynapse.net,1433`
**Pool:** `daisoitsqlpooltest` (Dedicated SQL Pool)
**Schema:** `IT`

### Key Tables (inferred from stored procedures & models)

```
IT Schema
├── IT.Roles                    RoleId, RoleName
├── IT.RolePagePermissions      RoleId, PageId, Permission
├── IT.RoleFeaturePermissions   RoleId, FeatureId, FeatureText, IsSelected
├── IT.Users                    UserId, Username, PasswordHash, RoleId
├── IT.Transactions             Sales / deal transaction data
└── IT.ServerMetrics            IT infrastructure metrics
```

### Stored Procedure Pattern

```sql
-- Auth namespace procedures
IT.CreateRole     (@RoleName, @PagesJson, @FeaturesJson, @RoleId = NULL)
IT.UpdateRole     (...)
IT.GetRoles       ()
IT.CreateUser     (...)
IT.Login          (@Username, @PasswordHash)

-- Data procedures
IT.PutSqlExecuted (...)
IT.GetSalesData   (@LocationId, @FromDate, @ToDate)
IT.GetDealData    (@LocationId, @FromDate, @ToDate)
```

### JSON Parsing in Synapse

```sql
-- Pages permissions from JSON array
INSERT INTO IT.RolePagePermissions
SELECT @RoleId,
       TRY_CAST(JSON_VALUE(value, '$.Id') AS INT),
       JSON_VALUE(value, '$.Permission')
FROM   OPENJSON(@PagesJson)
WHERE  TRY_CAST(JSON_VALUE(value, '$.IsSelected') AS BIT) = 1;

-- Features from nested JSON
FROM OPENJSON(@FeaturesJson, '$.Features')
WITH ( Name NVARCHAR(200) '$.Name', Properties NVARCHAR(MAX) '$.Properties' AS JSON )
CROSS APPLY OPENJSON(Properties)
WITH ( FeatureId INT '$.Id', FeatureText NVARCHAR(200) '$.Text', IsSelected BIT '$.IsSelected' )
```

---

## 4. Full Data Flow Architecture

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                              REQUEST FLOW                                      │
└────────────────────────────────────────────────────────────────────────────────┘

  BROWSER                    NEXT.JS               ASP.NET CORE          SYNAPSE
  ─────────                  ───────               ────────────          ───────

  Login Form
     │
     │ POST /api/auth/login
     ▼
  next.config.ts ──────────────────────────────► AuthController
  (proxy rewrite)                                      │
                                                       │
                                              AuthResource.cs
                                                       │
                                               SqlCommand + SP
                                                       │
                                                       ▼
                                              IT.Users table
                                              (Synapse Pool)
                                                       │
                                               UserModel ◄────────────────┘
                                                       │
                              ◄────────────────────────┘
  localStorage
  [token + user]
     │
     │ GET /api/itdashboard/*
     ▼
  next.config.ts ──────────────────────────────► ITDashboardController
  (proxy rewrite)                                      │
                                            ITDashboardResourceAccess
                                                       │
                                               SqlCommand + SP
                                                       │
                                                       ▼
                                              IT.Transactions /
                                              IT.ServerMetrics
                                              (Synapse Pool)
                                                       │
                              ◄────────────────────────┘
  Recharts renders
  KPI Cards + Charts
```

---

## 5. Role & Permission Model

```
User
 └── RoleId ──► Role
                 ├── RolePagePermissions[]
                 │     ├── PageId
                 │     └── Permission (string)
                 └── RoleFeaturePermissions[]
                       ├── FeatureId
                       ├── FeatureText
                       └── IsSelected (bit)

Stored on client as:
  localStorage["enterprise_user"].PagePermissions = "[{...},{...}]"
  localStorage["enterprise_user"].Features        = "{Features:[{...}]}"
```

---

## 6. Deployment Architecture (Current vs Recommended)

### Current (Dev)

```
localhost:3000          localhost:44358          Azure Synapse
Next.js dev server  ──► ASP.NET Core API    ──► daisosynapsetest
(npm run dev)           (VS / IIS Express)       .sql.azuresynapse.net
```

### Recommended (Production — Azure)

```
                        ┌─────────────────────────────────────────┐
                        │           AZURE CLOUD                   │
                        │                                         │
  Users                 │  ┌─────────────────┐                   │
    │                   │  │ Azure Static    │                   │
    │ HTTPS             │  │ Web Apps        │                   │
    └───────────────────┼─►│ (Next.js/React) │                   │
                        │  │ CDN Enabled     │                   │
                        │  └────────┬────────┘                   │
                        │           │ HTTPS /api/*               │
                        │           ▼                            │
                        │  ┌─────────────────┐                   │
                        │  │ Azure App       │                   │
                        │  │ Service         │◄──────────────────┤
                        │  │ (ASP.NET Core)  │                   │
                        │  │ .NET 5 → 8      │                   │
                        │  └────────┬────────┘                   │
                        │           │ TCP 1433                   │
                        │           ▼                            │
                        │  ┌─────────────────┐                   │
                        │  │ Azure Synapse   │                   │
                        │  │ Analytics       │                   │
                        │  │ (existing)      │                   │
                        │  └─────────────────┘                   │
                        └─────────────────────────────────────────┘
```

---

## 7. Security Findings & Recommendations

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | DB credentials in `appsettings.json` | 🔴 HIGH | Move to **Azure Key Vault** or env variables |
| 2 | CORS `AllowAll` (any origin) | 🟡 MEDIUM | Whitelist specific frontend domain |
| 3 | Token stored in `localStorage` | 🟡 MEDIUM | Consider `httpOnly` cookie instead |
| 4 | `ignoreBuildErrors: true` in Next.js | 🟡 MEDIUM | Remove — hides TypeScript errors in prod |
| 5 | Developer exception page in production | 🟡 MEDIUM | Guard with `env.IsDevelopment()` only |
| 6 | `System.Data.SqlClient` (deprecated) | 🟢 LOW | Already using `Microsoft.Data.SqlClient` too — remove old one |
| 7 | .NET 5.0 is end-of-life | 🟡 MEDIUM | Upgrade to **.NET 8 LTS** |

---

## 8. Tech Stack Summary Card

```
┌──────────────────────────────────────────────────────────┐
│              GNC ENTERPRISE REPORT                       │
│              TECH STACK AT A GLANCE                      │
├──────────────┬───────────────────────────────────────────┤
│ FRONTEND     │ Next.js 16 · React 19 · TypeScript 5     │
│              │ Tailwind CSS 4 · Axios · Recharts         │
│              │ Lucide Icons · App Router                 │
├──────────────┼───────────────────────────────────────────┤
│ BACKEND      │ ASP.NET Core 5.0 · C# 9                  │
│              │ ADO.NET · Stored Procedures               │
│              │ Swagger UI · REST API                     │
├──────────────┼───────────────────────────────────────────┤
│ DATABASE     │ Azure Synapse Analytics                   │
│              │ Dedicated SQL Pool · T-SQL                │
│              │ OPENJSON · Schema: IT                     │
├──────────────┼───────────────────────────────────────────┤
│ AUTH         │ SHA256 Password Hashing                   │
│              │ Session Token (GUID)                      │
│              │ Role-Based Page + Feature Permissions     │
├──────────────┼───────────────────────────────────────────┤
│ DEPLOYMENT   │ Dev: localhost (Next.js + IIS Express)    │
│ (Recommended)│ Prod: Azure Static Web Apps +             │
│              │       Azure App Service + Synapse         │
└──────────────┴───────────────────────────────────────────┘
```
