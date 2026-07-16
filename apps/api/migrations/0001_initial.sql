CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE app_user (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  deletion_requested_at timestamptz
);

CREATE TABLE external_identity (
  issuer text NOT NULL,
  subject text NOT NULL,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (issuer, subject)
);

CREATE TABLE card (
  id uuid PRIMARY KEY,
  provider text NOT NULL,
  provider_id text NOT NULL,
  game text NOT NULL CHECK (game IN ('pokemon', 'one-piece', 'gundam', 'yu-gi-oh')),
  name text NOT NULL,
  set_name text NOT NULL,
  card_number text NOT NULL,
  rarity text NOT NULL,
  language text NOT NULL,
  image_url text NOT NULL,
  search_document tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', name || ' ' || set_name || ' ' || card_number || ' ' || rarity)
  ) STORED,
  UNIQUE (provider, provider_id)
);
CREATE INDEX card_search_idx ON card USING gin (search_document);
CREATE INDEX card_name_trgm_idx ON card USING gin (name gin_trgm_ops);

CREATE TABLE market_variant (
  id uuid PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES card(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('raw', 'graded')),
  raw_condition text,
  grader text,
  grade text,
  CHECK (
    (kind = 'raw' AND raw_condition IS NOT NULL AND grader IS NULL AND grade IS NULL)
    OR
    (kind = 'graded' AND raw_condition IS NULL AND grader IS NOT NULL AND grade IS NOT NULL)
  )
);

CREATE TABLE price_snapshot (
  id uuid PRIMARY KEY,
  variant_id uuid NOT NULL REFERENCES market_variant(id) ON DELETE CASCADE,
  market_cents integer NOT NULL CHECK (market_cents >= 0),
  currency char(3) NOT NULL CHECK (currency = 'USD'),
  source text NOT NULL,
  observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (variant_id, source, observed_at)
);
CREATE INDEX price_snapshot_current_idx
  ON price_snapshot (variant_id, observed_at DESC);

CREATE TABLE acquisition_lot (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES card(id),
  variant_id uuid NOT NULL REFERENCES market_variant(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  purchase_date date NOT NULL,
  total_cost_cents integer NOT NULL CHECK (total_cost_cents >= 0),
  notes text CHECK (length(notes) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX acquisition_lot_owner_idx
  ON acquisition_lot (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE portfolio_snapshot (
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  market_value_cents bigint NOT NULL CHECK (market_value_cents >= 0),
  cost_basis_cents bigint NOT NULL CHECK (cost_basis_cents >= 0),
  valued_items integer NOT NULL CHECK (valued_items >= 0),
  unpriced_items integer NOT NULL CHECK (unpriced_items >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, snapshot_date)
);

CREATE TABLE idempotency_record (
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  request_hash char(64) NOT NULL,
  response_status smallint NOT NULL,
  response_body jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, idempotency_key)
);

CREATE TABLE audit_event (
  id uuid PRIMARY KEY,
  actor_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  result text NOT NULL CHECK (result IN ('success', 'denied')),
  request_id text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE acquisition_lot ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY acquisition_lot_owner ON acquisition_lot
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

CREATE POLICY portfolio_snapshot_owner ON portfolio_snapshot
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
