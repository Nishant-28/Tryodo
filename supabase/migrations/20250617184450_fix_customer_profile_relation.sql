ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES "public"."profiles"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
