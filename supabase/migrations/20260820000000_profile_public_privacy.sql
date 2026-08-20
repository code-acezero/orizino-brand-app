-- Add is_public_profile column to profiles to allow staff to publish/unpublish public profile for privacy
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public_profile boolean DEFAULT true;

-- Ensure employee_identities has is_public
ALTER TABLE employee_identities ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

COMMENT ON COLUMN profiles.is_public_profile IS 'Staff privacy switch to publish or unpublish their public profile across brand and storefront surfaces.';
