-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  catagory text,
  icon text NOT NULL,
  points numeric NOT NULL,
  task_type text NOT NULL,
  task_requirement numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  description text,
  name_hebrew text,
  description_hebrew text,
  CONSTRAINT achievements_pkey PRIMARY KEY (id)
);
CREATE TABLE public.automation_workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  trigger_type character varying NOT NULL CHECK (trigger_type::text = ANY (ARRAY['new_lead'::character varying, 'trial_scheduled'::character varying, 'trial_completed'::character varying, 'no_response'::character varying, 'conversion'::character varying, 'subscription_end'::character varying]::text[])),
  trigger_delay_hours integer DEFAULT 0,
  target_status character varying,
  message_template text NOT NULL,
  is_active boolean DEFAULT true,
  times_sent integer DEFAULT 0,
  response_rate numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT automation_workflows_pkey PRIMARY KEY (id)
);
CREATE TABLE public.class_bookings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  class_id uuid,
  status text DEFAULT 'confirmed'::text,
  booked_at timestamp with time zone DEFAULT now(),
  attended_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  booking_date timestamp with time zone DEFAULT now(),
  CONSTRAINT class_bookings_pkey PRIMARY KEY (id),
  CONSTRAINT class_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT class_bookings_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.class_schedules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  coach_id uuid,
  coach_name text NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time without time zone NOT NULL,
  duration_minutes integer NOT NULL,
  max_participants integer NOT NULL,
  required_subscription_level integer DEFAULT 1,
  location text,
  class_type text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT class_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT class_schedules_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  name_hebrew text NOT NULL,
  description text,
  description_hebrew text,
  coach_id uuid,
  coach_name text NOT NULL,
  class_date timestamp with time zone NOT NULL,
  duration_minutes integer NOT NULL,
  max_participants integer NOT NULL,
  current_participants integer DEFAULT 0,
  required_subscription_level integer DEFAULT 1,
  location text,
  location_hebrew text,
  class_type text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  schedule_id uuid,
  CONSTRAINT classes_pkey PRIMARY KEY (id),
  CONSTRAINT classes_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT classes_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.class_schedules(id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  avatar_url text,
  last_visit_date timestamp without time zone,
  status text DEFAULT 'active'::text,
  birthday_date date,
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.green_invoice_clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  gi_client_id text NOT NULL,
  gi_client_data jsonb,
  synced_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT green_invoice_clients_pkey PRIMARY KEY (id),
  CONSTRAINT green_invoice_clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.green_invoice_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  environment text NOT NULL CHECK (environment = ANY (ARRAY['sandbox'::text, 'production'::text])),
  api_key text NOT NULL,
  api_secret text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT green_invoice_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.green_invoice_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  gi_document_id text NOT NULL,
  document_type integer NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'ILS'::text,
  status integer,
  document_data jsonb,
  payment_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT green_invoice_documents_pkey PRIMARY KEY (id),
  CONSTRAINT green_invoice_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.green_invoice_sync_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  operation text NOT NULL,
  user_id uuid,
  status text NOT NULL CHECK (status = ANY (ARRAY['success'::text, 'failed'::text, 'pending'::text])),
  request_data jsonb,
  response_data jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT green_invoice_sync_log_pkey PRIMARY KEY (id),
  CONSTRAINT green_invoice_sync_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.lead_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  new_leads integer DEFAULT 0,
  contacted_leads integer DEFAULT 0,
  trials_scheduled integer DEFAULT 0,
  trials_completed integer DEFAULT 0,
  conversions integer DEFAULT 0,
  contact_rate numeric DEFAULT 0,
  trial_rate numeric DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  source_breakdown jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT lead_analytics_pkey PRIMARY KEY (id)
);
CREATE TABLE public.lead_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  interaction_type character varying NOT NULL CHECK (interaction_type::text = ANY (ARRAY['whatsapp_sent'::character varying, 'whatsapp_received'::character varying, 'phone_call'::character varying, 'email_sent'::character varying, 'meeting'::character varying, 'trial_class'::character varying, 'note'::character varying, 'status_change'::character varying]::text[])),
  subject character varying,
  message text,
  outcome character varying,
  is_automated boolean DEFAULT false,
  automation_workflow_id uuid,
  created_by_user_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT lead_interactions_pkey PRIMARY KEY (id),
  CONSTRAINT lead_interactions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT lead_interactions_automation_workflow_id_fkey FOREIGN KEY (automation_workflow_id) REFERENCES public.automation_workflows(id),
  CONSTRAINT lead_interactions_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  phone character varying NOT NULL UNIQUE,
  email character varying,
  status character varying NOT NULL DEFAULT 'new'::character varying CHECK (status::text = ANY (ARRAY['new'::character varying, 'contacted'::character varying, 'interested'::character varying, 'trial_scheduled'::character varying, 'trial_completed'::character varying, 'converted'::character varying, 'not_interested'::character varying, 'no_response'::character varying]::text[])),
  source character varying NOT NULL DEFAULT 'direct'::character varying CHECK (source::text = ANY (ARRAY['direct'::character varying, 'referral'::character varying, 'instagram'::character varying, 'facebook'::character varying, 'google'::character varying, 'website'::character varying, 'whatsapp'::character varying, 'other'::character varying]::text[])),
  referred_by_user_id uuid,
  referral_code character varying,
  referral_plates_awarded boolean DEFAULT false,
  trial_class_date timestamp with time zone,
  trial_class_completed boolean DEFAULT false,
  trial_class_feedback text,
  converted_to_user_id uuid,
  converted_at timestamp with time zone,
  preferred_contact_method character varying DEFAULT 'whatsapp'::character varying CHECK (preferred_contact_method::text = ANY (ARRAY['whatsapp'::character varying, 'phone'::character varying, 'email'::character varying]::text[])),
  tags ARRAY,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  last_contact_at timestamp with time zone,
  automation_stage integer DEFAULT 0,
  automation_paused boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_referred_by_user_id_fkey FOREIGN KEY (referred_by_user_id) REFERENCES auth.users(id),
  CONSTRAINT leads_converted_to_user_id_fkey FOREIGN KEY (converted_to_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  category character varying,
  message_text text NOT NULL,
  times_used integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT message_templates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notification_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type character varying NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  opened_at timestamp with time zone,
  is_read boolean DEFAULT false,
  CONSTRAINT notification_history_pkey PRIMARY KEY (id),
  CONSTRAINT notification_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.plate_discounts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  discount_type text CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'plates'::text])),
  discount_value numeric NOT NULL,
  plates_cost integer,
  min_purchase numeric,
  max_uses integer,
  current_uses integer DEFAULT 0,
  is_active boolean DEFAULT true,
  expires_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT plate_discounts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.plate_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  amount integer NOT NULL,
  type text CHECK (type = ANY (ARRAY['earned'::text, 'spent'::text, 'refunded'::text])),
  reason text,
  achievement_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT plate_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT plate_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT plate_transactions_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id)
);
CREATE TABLE public.plates_discounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL UNIQUE,
  discount_type character varying NOT NULL CHECK (discount_type::text = ANY (ARRAY['percentage'::character varying, 'fixed_amount'::character varying, 'plates'::character varying]::text[])),
  discount_value numeric NOT NULL,
  min_purchase_amount numeric DEFAULT 0,
  max_uses integer DEFAULT 0,
  used_count integer DEFAULT 0,
  valid_from timestamp with time zone DEFAULT timezone('utc'::text, now()),
  valid_until timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT plates_discounts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.plates_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  transaction_type character varying NOT NULL CHECK (transaction_type::text = ANY (ARRAY['earned'::character varying, 'spent'::character varying, 'bonus'::character varying, 'refund'::character varying]::text[])),
  source character varying NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT plates_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT plates_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  phone_number text,
  is_admin boolean DEFAULT false,
  is_coach boolean DEFAULT false,
  avatar_url text,
  subscription_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  role character varying DEFAULT 'user'::character varying,
  plate_balance integer DEFAULT 0,
  subscription_type character varying DEFAULT 'basic'::character varying,
  subscription_status character varying DEFAULT 'cancelled'::character varying,
  subscription_start timestamp with time zone,
  subscription_end timestamp with time zone,
  classes_per_month integer DEFAULT 0,
  classes_used integer DEFAULT 0,
  block_end_date timestamp with time zone,
  late_cancellations integer DEFAULT 0,
  total_workouts integer DEFAULT 0,
  full_name text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.referral_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_lead_id uuid NOT NULL UNIQUE,
  plates_awarded integer NOT NULL DEFAULT 200,
  reward_status character varying DEFAULT 'pending'::character varying CHECK (reward_status::text = ANY (ARRAY['pending'::character varying, 'awarded'::character varying, 'cancelled'::character varying]::text[])),
  awarded_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT referral_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT referral_rewards_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES auth.users(id),
  CONSTRAINT referral_rewards_referred_lead_id_fkey FOREIGN KEY (referred_lead_id) REFERENCES public.leads(id)
);
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['unlimited'::text, 'limited'::text])),
  sessions_per_week integer,
  price-6-months numeric NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  price-3-months numeric,
  CONSTRAINT subscription_plans_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  due_date timestamp without time zone NOT NULL,
  status text DEFAULT 'pending'::text,
  client_id uuid,
  completed boolean DEFAULT false,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.ticket_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  total_sessions integer NOT NULL,
  validity_days integer NOT NULL,
  price numeric NOT NULL,
  description text,
  is_for_new_members_only boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ticket_plans_pkey PRIMARY KEY (id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  amount numeric NOT NULL,
  date timestamp without time zone NOT NULL,
  type text NOT NULL,
  CONSTRAINT transactions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  achievement_id uuid NOT NULL,
  progress numeric NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  date_earned timestamp with time zone,
  is_challenge boolean NOT NULL DEFAULT false,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id)
);
CREATE TABLE public.user_health_data (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  steps integer DEFAULT 0,
  distance numeric DEFAULT 0,
  active_minutes integer DEFAULT 0,
  calories integer DEFAULT 0,
  resting_heart_rate integer,
  sleep_minutes integer,
  synced_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  source character varying DEFAULT 'manual'::character varying,
  CONSTRAINT user_health_data_pkey PRIMARY KEY (id),
  CONSTRAINT user_health_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_health_sync_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  auto_sync_enabled boolean DEFAULT false,
  sync_frequency character varying DEFAULT 'daily'::character varying,
  last_sync timestamp with time zone,
  sync_steps boolean DEFAULT true,
  sync_workouts boolean DEFAULT true,
  sync_calories boolean DEFAULT true,
  sync_heart_rate boolean DEFAULT false,
  sync_sleep boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_health_sync_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_health_sync_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_health_workouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  external_id character varying NOT NULL UNIQUE,
  workout_type character varying NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  duration integer NOT NULL,
  calories integer,
  distance numeric,
  average_heart_rate integer,
  max_heart_rate integer,
  source character varying NOT NULL,
  synced_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  plates_awarded boolean DEFAULT false,
  CONSTRAINT user_health_workouts_pkey PRIMARY KEY (id),
  CONSTRAINT user_health_workouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plates_earned boolean DEFAULT true,
  achievements boolean DEFAULT true,
  class_reminders boolean DEFAULT true,
  subscription_alerts boolean DEFAULT true,
  workout_reminders boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_plates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  balance integer DEFAULT 0,
  total_earned integer DEFAULT 0,
  total_spent integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_plates_pkey PRIMARY KEY (id),
  CONSTRAINT user_plates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.user_push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  push_token text NOT NULL,
  platform character varying NOT NULL CHECK (platform::text = ANY (ARRAY['ios'::character varying, 'android'::character varying, 'web'::character varying]::text[])),
  device_name character varying,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  last_used_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  is_active boolean DEFAULT true,
  CONSTRAINT user_push_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT user_push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  subscription_id uuid,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.workout_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL,
  exercise_name text NOT NULL,
  sets integer NOT NULL DEFAULT 1,
  reps integer NOT NULL DEFAULT 1,
  weight numeric,
  notes text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workout_exercises_pkey PRIMARY KEY (id),
  CONSTRAINT workout_exercises_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.workouts(id)
);
CREATE TABLE public.workouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  workout_date date NOT NULL,
  duration integer NOT NULL,
  calories integer,
  workout_type text NOT NULL CHECK (workout_type = ANY (ARRAY['strength'::text, 'cardio'::text, 'yoga'::text, 'hiit'::text, 'pilates'::text, 'boxing'::text, 'dance'::text, 'other'::text])),
  notes text,
  heart_rate_avg integer,
  heart_rate_max integer,
  distance numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workouts_pkey PRIMARY KEY (id),
  CONSTRAINT workouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);