# Supabase Edge Function Architecture

## Overview

This document defines the Supabase edge function architecture for EG-Maps, including crew member synchronization, grants management, and observatory data operations.

## Database Schema

### Core Tables

#### 1. `crew_members`

```sql
CREATE TABLE crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id TEXT NOT NULL,
  crew_name TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT NOT NULL,
  region TEXT NOT NULL,
  coordinates POINT NOT NULL,
  lead_name TEXT,
  lead_email TEXT,
  lead_photo_url TEXT,
  social_links JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT crew_members_crew_id_unique UNIQUE (crew_id),
  CONSTRAINT crew_members_country_code_format CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT crew_members_email_format CHECK (lead_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for performance
CREATE INDEX idx_crew_members_country ON crew_members(country);
CREATE INDEX idx_crew_members_region ON crew_members(region);
CREATE INDEX idx_crew_members_is_active ON crew_members(is_active);
CREATE INDEX idx_crew_members_crew_name ON crew_members USING gin (crew_name gin_trgm_ops);

-- Enable PostGIS for spatial queries
ALTER TABLE crew_members ADD COLUMN geom GEOMETRY(POINT, 4326);
UPDATE crew_members SET geom = ST_SetSRID(ST_MakePoint(coordinates[0], coordinates[1]), 4326);
CREATE INDEX idx_crew_members_geom ON crew_members USING gist (geom);
```

#### 2. `crew_members_audit`

```sql
CREATE TABLE crew_members_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_member_id UUID NOT NULL REFERENCES crew_members(id),
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crew_members_audit_crew_member ON crew_members_audit(crew_member_id);
CREATE INDEX idx_crew_members_audit_changed_at ON crew_members_audit(changed_at);
```

#### 3. `roles`

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
  ('admin', 'Full system access', ARRAY['read', 'write', 'delete', 'manage_users']),
  ('crew_lead', 'Crew leadership access', ARRAY['read', 'write_crew', 'manage_members']),
  ('member', 'Basic crew member access', ARRAY['read', 'update_profile']),
  ('viewer', 'Read-only access', ARRAY['read']);
```

#### 4. `user_roles`

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  crew_member_id UUID REFERENCES crew_members(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT user_roles_unique UNIQUE (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
```

### Grants Tables

#### 5. `grants`

```sql
CREATE TABLE grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'funded', 'completed')),
  applicant_id UUID NOT NULL REFERENCES auth.users(id),
  crew_member_id UUID REFERENCES crew_members(id),
  category TEXT NOT NULL,
  timeline JSONB NOT NULL DEFAULT '{}',
  budget JSONB NOT NULL DEFAULT '{}',
  attachments TEXT[] DEFAULT '{}',
  review_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_grants_status ON grants(status);
CREATE INDEX idx_grants_applicant ON grants(applicant_id);
CREATE INDEX idx_grants_crew ON grants(crew_member_id);
```

#### 6. `grants_audit`

```sql
CREATE TABLE grants_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID NOT NULL REFERENCES grants(id),
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE')),
  old_status TEXT,
  new_status TEXT,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Observatory Tables

#### 7. `mining_processes`

```sql
CREATE TABLE mining_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id TEXT NOT NULL UNIQUE,
  process_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  municipality TEXT NOT NULL,
  category TEXT NOT NULL,
  phase TEXT NOT NULL,
  area_hectares DECIMAL(12,2) NOT NULL,
  coordinates POINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mining_processes ADD COLUMN geom GEOMETRY(POINT, 4326);
UPDATE mining_processes SET geom = ST_SetSRID(ST_MakePoint(coordinates[0], coordinates[1]), 4326);
CREATE INDEX idx_mining_processes_geom ON mining_processes USING gist (geom);
CREATE INDEX idx_mining_processes_state ON mining_processes(state_code);
CREATE INDEX idx_mining_processes_category ON mining_processes(category);
```

#### 8. `observatory_contributions`

```sql
CREATE TABLE observatory_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id TEXT NOT NULL REFERENCES mining_processes(process_id),
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('cultural', 'environmental', 'geographic', 'historical', 'indigenous_knowledge')),
  description TEXT NOT NULL,
  coordinates POINT,
  photos TEXT[] DEFAULT '{}',
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE observatory_contributions ADD COLUMN geom GEOMETRY(POINT, 4326);
UPDATE observatory_contributions SET geom = ST_SetSRID(ST_MakePoint(coordinates[0], coordinates[1]), 4326) WHERE coordinates IS NOT NULL;
CREATE INDEX idx_observatory_contributions_process ON observatory_contributions(process_id);
CREATE INDEX idx_observatory_contributions_type ON observatory_contributions(contribution_type);
CREATE INDEX idx_observatory_contributions_submitted ON observatory_contributions(submitted_by);
CREATE INDEX idx_observatory_contributions_geom ON observatory_contributions USING gist (geom);
```

## Row Level Security (RLS) Policies

### Crew Members

```sql
-- Enable RLS
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON crew_members
  FOR SELECT USING (true);

-- Crew leads can update their own crew
CREATE POLICY "Crew leads can update" ON crew_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'crew_lead'
        AND ur.crew_member_id = crew_members.id
    )
  );

-- Admins can do everything
CREATE POLICY "Admins full access" ON crew_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'admin'
    )
  );

-- Audit trigger
CREATE OR REPLACE FUNCTION audit_crew_members()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO crew_members_audit (crew_member_id, action, new_data, changed_by)
    VALUES (NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO crew_members_audit (crew_member_id, action, old_data, new_data, changed_by)
    VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO crew_members_audit (crew_member_id, action, old_data, changed_by)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER crew_members_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON crew_members
  FOR EACH ROW EXECUTE FUNCTION audit_crew_members();
```

### Grants

```sql
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;

-- Applicants can read their own grants
CREATE POLICY "Applicants read own" ON grants
  FOR SELECT USING (applicant_id = auth.uid());

-- Applicants can insert their own grants
CREATE POLICY "Applicants insert own" ON grants
  FOR INSERT WITH CHECK (applicant_id = auth.uid());

-- Applicants can update draft grants
CREATE POLICY "Applicants update draft" ON grants
  FOR UPDATE USING (
    applicant_id = auth.uid()
    AND status = 'draft'
  );

-- Admins and reviewers can read all
CREATE POLICY "Admins read all" ON grants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'crew_lead')
    )
  );

-- Admins can update any grant
CREATE POLICY "Admins update any" ON grants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'admin'
    )
  );
```

## Edge Functions

### 1. `crew-sync`

**Purpose**: Synchronize crew data from static JSON to Supabase

**Trigger**: Scheduled (daily) or manual

**Logic**:
```typescript
// supabase/functions/crew-sync/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Fetch static crew data
  const staticData = await fetch('https://eg-maps.example.com/data/crew-data.json')
    .then(r => r.json())

  // Upsert each crew
  for (const crew of staticData.crews) {
    const { error } = await supabase
      .from('crew_members')
      .upsert({
        crew_id: crew.id,
        crew_name: crew.name,
        country: crew.country,
        country_code: crew.countryCode,
        region: crew.region,
        coordinates: `(${crew.coordinates.lng}, ${crew.coordinates.lat})`,
        lead_name: crew.lead?.name,
        lead_email: crew.lead?.email,
        lead_photo_url: crew.lead?.photo,
        social_links: crew.socialLinks || {},
        tags: crew.tags || [],
        is_active: crew.isActive ?? true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'crew_id' })

    if (error) console.error(`Failed to sync crew ${crew.id}:`, error)
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 2. `grants-submit`

**Purpose**: Submit grant application with validation

**Endpoint**: `POST /functions/v1/grants-submit`

**Logic**:
```typescript
// supabase/functions/grants-submit/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { title, description, amount, category, timeline, budget, attachments } = await req.json()

  // Validate
  if (!title || !description || !amount || !category) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Get authenticated user
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
  }

  // Create grant
  const { data, error } = await supabase
    .from('grants')
    .insert({
      title,
      description,
      amount,
      category,
      timeline,
      budget,
      attachments,
      applicant_id: user.id,
      status: 'submitted'
    })
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ grant: data }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 3. `grants-review`

**Purpose**: Review and update grant status

**Endpoint**: `PUT /functions/v1/grants-review`

**Logic**:
```typescript
// supabase/functions/grants-review/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { grant_id, status, review_notes } = await req.json()

  // Verify admin/reviewer role
  const authHeader = req.headers.get('Authorization')
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', '') || '')
  
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role:roles(name)')
    .eq('user_id', user.id)
    .single()

  if (!roleData?.role?.name || !['admin', 'crew_lead'].includes(roleData.role.name)) {
    return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { status: 403 })
  }

  // Update grant
  const { data, error } = await supabase
    .from('grants')
    .update({
      status,
      review_notes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', grant_id)
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ grant: data }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 4. `observatory-contributions`

**Purpose**: Track cultural and environmental contributions

**Endpoint**: `POST /functions/v1/observatory-contributions`

**Logic**:
```typescript
// supabase/functions/observatory-contributions/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { process_id, contribution_type, description, coordinates, photos } = await req.json()

  // Validate
  if (!process_id || !contribution_type) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
  }

  // Get authenticated user
  const authHeader = req.headers.get('Authorization')
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', '') || '')
  
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // Create contribution record
  const { data, error } = await supabase
    .from('observatory_contributions')
    .insert({
      process_id,
      contribution_type,
      description,
      coordinates: coordinates ? `(${coordinates.lng}, ${coordinates.lat})` : null,
      photos,
      submitted_by: user.id
    })
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ contribution: data }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

## Deployment Scripts

### Initial Setup

```bash
#!/bin/bash
# deploy-supabase.sh

# Link to Supabase project
supabase link --project-ref <project-id>

# Run migrations
supabase db push

# Deploy edge functions
supabase functions deploy crew-sync
supabase functions deploy grants-submit
supabase functions deploy grants-review
supabase functions deploy observatory-contributions

# Set environment variables
supabase secrets set SUPABASE_URL=<url>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
```

### Scheduled Sync

```bash
# Add to crontab for daily sync
0 2 * * * supabase functions invoke crew-sync
```

## Migration from Static Data

### Step 1: Initial Import

```typescript
// scripts/import-crew-data.ts
import { createClient } from '@supabase/supabase-js'
import crewData from '../lib/crew-data.json'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function importData() {
  for (const crew of crewData.crews) {
    await supabase.from('crew_members').upsert({
      crew_id: crew.id,
      crew_name: crew.name,
      // ... map all fields
    }, { onConflict: 'crew_id' })
  }
}

importData()
```

### Step 2: Update App to Use Supabase

```typescript
// composables/useCrewData.ts
export function useCrewData() {
  const supabase = useSupabase()

  async function fetchCrews() {
    const { data, error } = await supabase
      .from('crew_members')
      .select('*')
      .eq('is_active', true)
    
    return data || []
  }

  async function updateCrew(id: string, updates: Partial<Crew>) {
    const { data, error } = await supabase
      .from('crew_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    return { data, error }
  }

  return { fetchCrews, updateCrew }
}
```

### Step 3: Remove Static Data

Once Supabase is fully integrated:

1. Remove `lib/crew-data.ts`
2. Update all imports to use `useCrewData()` composable
3. Add loading states and error handling
4. Implement offline fallback if needed

## Monitoring and Logging

### Database Metrics

```sql
-- Query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Recent slow queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;

-- Table bloat
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Observatory Contributions

```sql
ALTER TABLE observatory_contributions ENABLE ROW LEVEL SECURITY;

-- Public read access for verified contributions
CREATE POLICY "Public read verified" ON observatory_contributions
  FOR SELECT USING (verified = true);

-- Authenticated users can read all contributions
CREATE POLICY "Authenticated read all" ON observatory_contributions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert contributions
CREATE POLICY "Authenticated insert own" ON observatory_contributions
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

-- Submitters can update their own unverified contributions
CREATE POLICY "Submitters update own unverified" ON observatory_contributions
  FOR UPDATE USING (
    submitted_by = auth.uid()
    AND verified = false
  );

-- Admins can verify and manage all contributions
CREATE POLICY "Admins full access" ON observatory_contributions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'admin'
    )
  );
```

### Edge Function Logging

```typescript
// supabase/functions/_shared/logger.ts
export function log(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(JSON.stringify({
    timestamp,
    level,
    message,
    ...data
  }))
}

export function info(message: string, data?: any) {
  log('INFO', message, data)
}

export function error(message: string, data?: any) {
  log('ERROR', message, data)
}
```

## Security Considerations

1. **RLS everywhere**: All tables have RLS enabled
2. **Audit logging**: All changes tracked in `*_audit` tables
3. **JWT verification**: All edge functions verify tokens
4. **Rate limiting**: Implement via Supabase Edge Function headers
5. **Input validation**: Server-side validation for all inputs
6. **File upload scanning**: Virus scan before storage
7. **Secrets management**: Use Supabase secrets, not env vars

## Performance Optimization

1. **Indexes**: Comprehensive indexes for common queries
2. **Connection pooling**: Use Supabase connection pool
3. **Caching**: Implement Redis for frequently accessed data
4. **Pagination**: Use cursor-based pagination for large datasets
5. **Batch operations**: Batch inserts/updates where possible
6. **Materialized views**: For complex aggregations