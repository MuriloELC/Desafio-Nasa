CREATE TABLE public.cereja_plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon double precision NOT NULL CHECK (lon BETWEEN -180 AND 180),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);

CREATE TABLE public.cereja_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  plot_id uuid NOT NULL,
  culture_id text NOT NULL,
  kind text NOT NULL,
  parent_id uuid,
  parent_kind text GENERATED ALWAYS AS ('cafe'::text) STORED,
  planted_on date NOT NULL,
  ended_on date CHECK (ended_on >= planted_on),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (parent_id IS NULL OR kind = 'entrelinha'),
  FOREIGN KEY (plot_id, user_id) REFERENCES public.cereja_plots(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (culture_id, kind) REFERENCES agro.cereja_cultures (culture_id, kind),
  FOREIGN KEY (parent_id, plot_id, user_id, parent_kind)
    REFERENCES public.cereja_cycles(id, plot_id, user_id, kind),
  UNIQUE (id, plot_id, user_id),
  UNIQUE (id, plot_id, user_id, kind)
);

CREATE TABLE public.cereja_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  plot_id uuid NOT NULL,
  cycle_id uuid,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 120),
  planned_on date NOT NULL,
  done_on date,
  state text NOT NULL DEFAULT 'planejada' CHECK (state IN ('planejada', 'realizada', 'cancelada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((state='realizada') = (done_on IS NOT NULL)),
  FOREIGN KEY (plot_id, user_id) REFERENCES public.cereja_plots(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (cycle_id, plot_id, user_id) REFERENCES public.cereja_cycles(id, plot_id, user_id)
);

CREATE TABLE public.cereja_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  plot_id uuid NOT NULL,
  reference_date date NOT NULL,
  method_version text NOT NULL,
  result jsonb NOT NULL CHECK (jsonb_typeof(result)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (plot_id, user_id) REFERENCES public.cereja_plots(id, user_id) ON DELETE CASCADE
);

DO $$
DECLARE rel text;
BEGIN
  FOREACH rel IN ARRAY ARRAY['cereja_plots', 'cereja_cycles', 'cereja_tasks', 'cereja_assessments'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rel);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', rel);
    EXECUTE format('GRANT SELECT, INSERT ON public.%I TO authenticated', rel);
    EXECUTE format('CREATE INDEX ON public.%I (user_id, created_at DESC)', rel);
    EXECUTE format('CREATE POLICY own_rows ON public.%I TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id)', rel);
  END LOOP;
END $$;

GRANT UPDATE (ended_on) ON public.cereja_cycles TO authenticated;
GRANT UPDATE (state, done_on) ON public.cereja_tasks TO authenticated;
