
-- Timestamp helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories"   ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public insert categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update categories" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Public delete categories" ON public.categories FOR DELETE USING (true);
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MASTER GOALS ============
CREATE TABLE public.master_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id TEXT,
  title TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.master_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read master_goals"   ON public.master_goals FOR SELECT USING (true);
CREATE POLICY "Public insert master_goals" ON public.master_goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update master_goals" ON public.master_goals FOR UPDATE USING (true);
CREATE POLICY "Public delete master_goals" ON public.master_goals FOR DELETE USING (true);
CREATE TRIGGER trg_master_goals_updated BEFORE UPDATE ON public.master_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STUDENTS ============
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  photo TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  assigned_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_points INTEGER DEFAULT 0,
  previous_rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read students"   ON public.students FOR SELECT USING (true);
CREATE POLICY "Public insert students" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update students" ON public.students FOR UPDATE USING (true);
CREATE POLICY "Public delete students" ON public.students FOR DELETE USING (true);
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SETTINGS ============
-- single-row settings table; key='appearance' is the canonical row
CREATE TABLE public.settings (
  id TEXT NOT NULL PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read settings"   ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public insert settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update settings" ON public.settings FOR UPDATE USING (true);
CREATE POLICY "Public delete settings" ON public.settings FOR DELETE USING (true);
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ACTIVITY LOGS ============
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'system',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read activity_logs"   ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "Public insert activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- ============ PAGE VIEWS ============
CREATE TABLE public.page_views (
  date DATE NOT NULL PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read page_views"   ON public.page_views FOR SELECT USING (true);
CREATE POLICY "Public insert page_views" ON public.page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update page_views" ON public.page_views FOR UPDATE USING (true);
CREATE TRIGGER trg_page_views_updated BEFORE UPDATE ON public.page_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
