-- Feiertage: Standard Baden-Württemberg
UPDATE "AppSetting" SET "bundesland" = 'BW' WHERE "bundesland" IS NULL;
ALTER TABLE "AppSetting" ALTER COLUMN "bundesland" SET NOT NULL, ALTER COLUMN "bundesland" SET DEFAULT 'BW';
