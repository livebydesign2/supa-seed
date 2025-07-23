# MakerKit Database Seeding Research & Best Practices

## Overview

This document outlines the research findings on how MakerKit implements database seeding for Supabase projects, along with identified best practices. MakerKit uses a pure SQL-based approach that differs significantly from programmatic seeding solutions.

## MakerKit Seeding Architecture

### 1. File Structure

MakerKit organizes its database setup into three distinct layers:

```
apps/web/supabase/
├── config.toml          # Supabase configuration
├── schemas/             # Modular schema definitions (17 files)
│   ├── 00-privileges.sql
│   ├── 01-enums.sql
│   ├── 02-config.sql
│   └── ... (up to 17-roles-seed.sql)
├── migrations/          # Timestamped schema changes
│   ├── 20221215192558_schema.sql
│   └── ...
└── seed.sql            # Test data for development
```

### 2. Execution Order

The seeding process follows a strict order:

1. **Schema files** - Applied alphabetically (00-17)
2. **Migrations** - Applied chronologically by timestamp
3. **Seed data** - Applied last via `seed.sql`

### 3. Configuration

The `config.toml` file orchestrates the seeding:

```toml
[db.migrations]
schema_paths = ["./schemas/*.sql"]

[db.seed]
sql_paths = ['seed.sql', './seeds/*.sql']
```

## Key Implementation Details

### Schema Design Patterns

1. **Modular Files**: Each schema file handles a specific domain
   - `00-privileges.sql` - Security setup
   - `03-accounts.sql` - Account tables
   - `04-roles.sql` - Role definitions

2. **Idempotent Operations**: Uses `IF NOT EXISTS` clauses
   ```sql
   CREATE TABLE IF NOT EXISTS public.accounts (
     id uuid NOT NULL DEFAULT gen_random_uuid(),
     -- ...
   );
   ```

3. **Dependency Management**: Files are numbered to ensure correct order

### Seed Data Structure

The `seed.sql` file creates:

```sql
-- Test users in auth.users
INSERT INTO auth.users (id, email, raw_user_meta_data, ...)
VALUES 
  ('uuid-1', 'test@makerkit.dev', '{"full_name": "Test User"}', ...),
  ('uuid-2', 'owner@makerkit.dev', '{"full_name": "Owner User"}', ...);

-- Test organization
INSERT INTO public.accounts (id, name, slug, ...)
VALUES ('org-uuid', 'Makerkit', 'makerkit', ...);

-- Memberships and roles
INSERT INTO public.accounts_memberships (account_id, user_id, role)
VALUES ('org-uuid', 'uuid-1', 'owner');
```

### Security Patterns

1. **Revoke Default Privileges**:
   ```sql
   REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
   ```

2. **Row Level Security (RLS)**:
   ```sql
   ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can read their own accounts"
   ON public.accounts FOR SELECT
   TO authenticated
   USING (id IN (
     SELECT account_id FROM public.accounts_memberships
     WHERE user_id = auth.uid()
   ));
   ```

3. **Secure Functions**:
   ```sql
   CREATE FUNCTION auth.user_id() 
   RETURNS uuid AS $$
     SELECT COALESCE(
       auth.jwt()->>'sub',
       (current_setting('request.jwt.claims', true)::json->>'sub')
     )::uuid
   $$ LANGUAGE sql STABLE SECURITY DEFINER;
   ```

## Best Practices Identified

### 1. Schema Organization

- **Number files** for explicit ordering (00-99 prefix)
- **One concern per file** (accounts, roles, billing, etc.)
- **Include comments** explaining complex logic
- **Version control** all schema files

### 2. Data Insertion

- **Use explicit IDs** for test data relationships
- **Set sequences** after bulk inserts:
  ```sql
  SELECT setval('public.accounts_id_seq', 
    (SELECT MAX(id) FROM public.accounts));
  ```
- **Include cleanup** for idempotency:
  ```sql
  TRUNCATE TABLE public.accounts CASCADE;
  ```

### 3. Development vs Production

- **Separate concerns**:
  ```sql
  -- Development only webhooks
  -- In production, configure these via Supabase dashboard
  INSERT INTO supabase_functions.hooks (...) 
  VALUES (...);
  ```
- **Use environment detection** when needed
- **Document production requirements** clearly

### 4. Multi-tenant Considerations

- **Personal accounts** auto-created via triggers
- **Team accounts** with hierarchical roles
- **Permission inheritance** through role levels

### 5. Testing Support

MakerKit includes comprehensive test users:
- `test@makerkit.dev` - Basic user
- `owner@makerkit.dev` - Team owner
- `member@makerkit.dev` - Team member
- `custom@makerkit.dev` - Custom role
- `super-admin@makerkit.dev` - Platform admin

## Execution Commands

### Development Workflow

```bash
# Initial setup
pnpm run supabase:web:start

# Reset database (drops all, re-applies everything)
pnpm run supabase:web:reset

# Apply only migrations
pnpm run supabase:web:migrate

# Direct Supabase CLI
pnpm --filter web supabase db reset
```

### Production Deployment

```bash
# Generate migration from local changes
supabase db diff --schema public,auth

# Apply to production
supabase db push --project-ref <project-id>
```

## Key Advantages

1. **Simplicity**: Pure SQL, no additional tooling
2. **Reliability**: Native Supabase CLI support
3. **Version Control**: Easy to track changes
4. **Performance**: Direct SQL execution
5. **Transparency**: Clear what data is created

## Limitations

1. **Static Data**: No dynamic/random generation
2. **Manual Updates**: Requires SQL editing
3. **Limited Flexibility**: Fixed test scenarios
4. **No Asset Handling**: No image/file uploads
5. **Repetitive**: Similar data requires duplication

## Recommendations for Hybrid Approach

For projects needing both approaches:

1. **Use MakerKit style for**:
   - Schema definitions
   - Core system data (roles, permissions)
   - Production migrations

2. **Use programmatic seeding for**:
   - Large test datasets
   - Dynamic content generation
   - Asset management
   - Development variations

## Migration Strategy

To adopt MakerKit patterns in existing projects:

1. **Extract schemas** into numbered files
2. **Create migrations** for existing structures
3. **Separate concerns** (schema vs seed data)
4. **Add RLS policies** systematically
5. **Test extensively** with db reset

## Conclusion

MakerKit's SQL-based seeding approach prioritizes simplicity, reliability, and transparency. While less flexible than programmatic solutions, it provides a solid foundation for SaaS applications with clear separation between structure and data. The modular organization and security-first design make it an excellent reference for Supabase best practices.