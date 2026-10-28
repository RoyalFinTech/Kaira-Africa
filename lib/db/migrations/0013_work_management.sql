CREATE TABLE IF NOT EXISTS work_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_projects_business_status_idx ON work_projects(business_id,status);

CREATE TABLE IF NOT EXISTS work_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  project_id uuid REFERENCES work_projects(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 160),
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_tasks_project_business_fk FOREIGN KEY (project_id,business_id)
    REFERENCES work_projects(id,business_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS work_tasks_business_status_due_idx ON work_tasks(business_id,status,due_date);
CREATE INDEX IF NOT EXISTS work_tasks_assignee_idx ON work_tasks(business_id,assigned_to);

CREATE TABLE IF NOT EXISTS work_task_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES work_tasks(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_task_events_task_created_idx ON work_task_events(task_id,created_at);

CREATE TABLE IF NOT EXISTS work_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 160),
  meeting_type text NOT NULL DEFAULT 'team' CHECK (meeting_type IN ('team','client','planning','review','other')),
  starts_at timestamptz,
  attendees jsonb NOT NULL DEFAULT '[]'::jsonb,
  agenda text,
  minutes text,
  decisions text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','held','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_meetings_business_date_idx ON work_meetings(business_id,starts_at);

-- API server performs explicit business-scoped authorization. These tables are not
-- accessed directly from browser clients; RLS remains enabled as defense in depth.
ALTER TABLE work_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_meetings ENABLE ROW LEVEL SECURITY;
