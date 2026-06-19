-- Store public instructor profile descriptions shown on course pages.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS bio TEXT;
