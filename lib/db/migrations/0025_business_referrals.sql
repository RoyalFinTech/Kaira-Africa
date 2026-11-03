-- Give every existing and future business its own stable referral code.
-- Referral attribution is business-to-business, not team membership.
ALTER TABLE public.businesses
  ADD COLUMN referral_code text,
  ADD COLUMN referred_by_business_id uuid;

UPDATE public.businesses
SET referral_code = 'KAI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
WHERE referral_code IS NULL;

ALTER TABLE public.businesses
  ALTER COLUMN referral_code SET NOT NULL;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_referred_by_business_id_fk
  FOREIGN KEY (referred_by_business_id)
  REFERENCES public.businesses(id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX businesses_referral_code_unique
  ON public.businesses (referral_code);

CREATE INDEX businesses_referred_by_business_idx
  ON public.businesses (referred_by_business_id);

COMMENT ON COLUMN public.businesses.referral_code IS
  'Stable share code for business-to-business referral attribution. Not a team invitation.';
COMMENT ON COLUMN public.businesses.referred_by_business_id IS
  'Business that referred this business at initial workspace creation. Future rewards are not enabled.';
