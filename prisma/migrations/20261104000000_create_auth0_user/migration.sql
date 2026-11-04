BEGIN;

DO $$
BEGIN
  IF current_setting('server_version_num')::integer < 180000 THEN
    RAISE EXCEPTION 'This migration requires PostgreSQL 18 or newer (native uuidv7)';
  END IF;
END;
$$;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "auth0Id" TEXT NOT NULL,
    "name" TEXT,
    "givenName" TEXT,
    "familyName" TEXT,
    "middleName" TEXT,
    "nickname" TEXT,
    "preferredUsername" TEXT,
    "email" TEXT,
    "emailVerified" BOOLEAN,
    "phoneNumber" TEXT,
    "phoneNumberVerified" BOOLEAN,
    "picture" TEXT,
    "profile" TEXT,
    "website" TEXT,
    "gender" TEXT,
    "birthdate" TEXT,
    "zoneinfo" TEXT,
    "locale" TEXT,
    "addressFormatted" TEXT,
    "addressStreetAddress" TEXT,
    "addressLocality" TEXT,
    "addressRegion" TEXT,
    "addressPostalCode" TEXT,
    "addressCountry" TEXT,
    "auth0UpdatedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_auth0Id_key" ON "User"("auth0Id");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");


-- Timestamps belong to PostgreSQL, including direct SQL updates.
CREATE FUNCTION set_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_updated_at_trigger
BEFORE UPDATE ON "User"
FOR EACH ROW
EXECUTE FUNCTION set_user_updated_at();

COMMIT;
