-- Create notification_preferences table
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES profiles(id) NOT NULL,
  push_notifications boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT true,
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time without time zone DEFAULT '22:00:00',
  quiet_hours_end time without time zone DEFAULT '08:00:00',
  order_status_notifications boolean DEFAULT true,
  delivery_status_notifications boolean DEFAULT true,
  payment_notifications boolean DEFAULT true,
  promotional_notifications boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id)
);

-- Create push_subscriptions table
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES profiles(id) NOT NULL,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, endpoint)
);

-- Create notification_queue table
CREATE TABLE notification_queue (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id uuid REFERENCES profiles(id) NOT NULL,
  notification_type varchar NOT NULL,
  title varchar NOT NULL,
  body text NOT NULL,
  icon text,
  badge text,
  tag varchar,
  data jsonb,
  actions jsonb,
  require_interaction boolean DEFAULT false,
  silent boolean DEFAULT false,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Notification preferences policies
CREATE POLICY "Users can read their own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = profile_id::text::uuid);

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = profile_id::text::uuid);

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = profile_id::text::uuid);

-- Push subscriptions policies
CREATE POLICY "Users can read their own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = profile_id::text::uuid);

CREATE POLICY "Users can insert their own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = profile_id::text::uuid);

CREATE POLICY "Users can delete their own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = profile_id::text::uuid);

-- Notification queue policies
CREATE POLICY "Users can read their own notifications"
  ON notification_queue FOR SELECT
  USING (auth.uid() = recipient_id::text::uuid);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_notification_queue_updated_at
  BEFORE UPDATE ON notification_queue
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column(); 