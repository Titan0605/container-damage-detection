CREATE TABLE "ContainerReport" (
  "id" UUID NOT NULL, "serial_number" VARCHAR(32) NOT NULL,
  "timestamp" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "image_url" TEXT,
  CONSTRAINT "ContainerReport_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DamageDetail" (
  "id" UUID NOT NULL, "report_id" UUID NOT NULL, "damage_type" VARCHAR(32) NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "DamageDetail_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DamageDetail_confidence_check" CHECK ("confidence" >= 0 AND "confidence" <= 1),
  CONSTRAINT "DamageDetail_type_check" CHECK ("damage_type" IN ('rust', 'hole', 'dent'))
);
CREATE INDEX "ContainerReport_timestamp_idx" ON "ContainerReport"("timestamp");
CREATE INDEX "ContainerReport_serial_number_timestamp_idx" ON "ContainerReport"("serial_number", "timestamp");
CREATE INDEX "DamageDetail_report_id_idx" ON "DamageDetail"("report_id");
CREATE INDEX "DamageDetail_damage_type_idx" ON "DamageDetail"("damage_type");
ALTER TABLE "DamageDetail" ADD CONSTRAINT "DamageDetail_report_id_fkey"
  FOREIGN KEY ("report_id") REFERENCES "ContainerReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
