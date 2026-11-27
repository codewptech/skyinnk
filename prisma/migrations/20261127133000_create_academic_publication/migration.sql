BEGIN;
CREATE UNIQUE INDEX "Lesson_id_courseId_key" ON "Lesson"("id", "courseId");

CREATE TABLE "CourseRelease" (
 "id" UUID NOT NULL DEFAULT uuidv7() PRIMARY KEY,
 "courseId" UUID NOT NULL,
 "version" INTEGER NOT NULL CHECK ("version" > 0),
 "state" TEXT NOT NULL DEFAULT 'STAGED',
 "sourceKey" TEXT NOT NULL CHECK ("sourceKey" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("sourceKey") <= 120),
 "slug" TEXT NOT NULL CHECK ("slug" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("slug") <= 120),
 "title" TEXT NOT NULL CHECK (char_length(btrim("title")) BETWEEN 1 AND 300),
 "summary" TEXT NOT NULL CHECK (char_length(btrim("summary")) BETWEEN 1 AND 10000),
 "audience" TEXT NOT NULL CHECK (char_length(btrim("audience")) BETWEEN 1 AND 1000),
 "subject" TEXT NOT NULL CHECK (char_length(btrim("subject")) BETWEEN 1 AND 200),
 "contentDigest" TEXT NOT NULL CHECK ("contentDigest" ~ '^[a-f0-9]{64}$'),
 "reviewedById" UUID NOT NULL,
 "reviewedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "rightsConfirmed" BOOLEAN NOT NULL CHECK ("rightsConfirmed"),
 "retiredAt" TIMESTAMPTZ(6),
 CONSTRAINT "CourseRelease_state_check" CHECK (("state" IN ('STAGED','ACTIVE') AND "retiredAt" IS NULL) OR ("state" IN ('SUPERSEDED','WITHDRAWN') AND "retiredAt" IS NOT NULL AND "retiredAt" >= "reviewedAt"))
);
CREATE UNIQUE INDEX "CourseRelease_id_courseId_key" ON "CourseRelease"("id", "courseId");
CREATE UNIQUE INDEX "CourseRelease_courseId_version_key" ON "CourseRelease"("courseId", "version");
CREATE INDEX "CourseRelease_state_slug_idx" ON "CourseRelease"("state", "slug");
CREATE INDEX "CourseRelease_reviewedById_idx" ON "CourseRelease"("reviewedById");
CREATE UNIQUE INDEX "CourseRelease_one_active" ON "CourseRelease"("courseId") WHERE "state" = 'ACTIVE';
ALTER TABLE "CourseRelease" ADD CONSTRAINT "CourseRelease_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CourseRelease" ADD CONSTRAINT "CourseRelease_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE "PublishedModule" (
 "id" UUID NOT NULL DEFAULT uuidv7() PRIMARY KEY,
 "releaseId" UUID NOT NULL,
 "courseId" UUID NOT NULL,
 "moduleId" UUID NOT NULL,
 "sourceKey" TEXT NOT NULL CHECK ("sourceKey" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("sourceKey") <= 120),
 "title" TEXT NOT NULL CHECK (char_length(btrim("title")) BETWEEN 1 AND 300),
 "position" INTEGER NOT NULL CHECK ("position" >= 0)
);
CREATE UNIQUE INDEX "PublishedModule_id_releaseId_courseId_key" ON "PublishedModule"("id", "releaseId", "courseId");
CREATE UNIQUE INDEX "PublishedModule_releaseId_moduleId_key" ON "PublishedModule"("releaseId", "moduleId");
CREATE UNIQUE INDEX "PublishedModule_releaseId_position_key" ON "PublishedModule"("releaseId", "position");
CREATE INDEX "PublishedModule_moduleId_courseId_idx" ON "PublishedModule"("moduleId", "courseId");
ALTER TABLE "PublishedModule" ADD CONSTRAINT "PublishedModule_releaseId_courseId_fkey" FOREIGN KEY ("releaseId", "courseId") REFERENCES "CourseRelease"("id", "courseId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PublishedModule" ADD CONSTRAINT "PublishedModule_moduleId_courseId_fkey" FOREIGN KEY ("moduleId", "courseId") REFERENCES "Module"("id", "courseId") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE "PublishedLesson" (
 "id" UUID NOT NULL DEFAULT uuidv7() PRIMARY KEY,
 "releaseId" UUID NOT NULL,
 "courseId" UUID NOT NULL,
 "publishedModuleId" UUID NOT NULL,
 "lessonId" UUID NOT NULL,
 "sourceKey" TEXT NOT NULL CHECK ("sourceKey" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("sourceKey") <= 120),
 "slug" TEXT NOT NULL CHECK ("slug" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("slug") <= 120),
 "title" TEXT NOT NULL CHECK (char_length(btrim("title")) BETWEEN 1 AND 300),
 "position" INTEGER NOT NULL CHECK ("position" >= 0),
 "kind" TEXT NOT NULL,
 "overview" TEXT NOT NULL CHECK (char_length(btrim("overview")) BETWEEN 1 AND 10000),
 "notesMarkdown" TEXT NOT NULL CHECK (char_length("notesMarkdown") <= 200000),
 "videoPublicId" TEXT,
 CONSTRAINT "PublishedLesson_kind_check" CHECK (("kind" = 'TEXT' AND "videoPublicId" IS NULL AND char_length(btrim("notesMarkdown")) > 0) OR ("kind" = 'VIDEO' AND "videoPublicId" IS NOT NULL AND "videoPublicId" ~ '^[A-Za-z0-9_-]{11}$'))
);
CREATE UNIQUE INDEX "PublishedLesson_id_releaseId_key" ON "PublishedLesson"("id", "releaseId");
CREATE UNIQUE INDEX "PublishedLesson_releaseId_lessonId_key" ON "PublishedLesson"("releaseId", "lessonId");
CREATE UNIQUE INDEX "PublishedLesson_releaseId_slug_key" ON "PublishedLesson"("releaseId", "slug");
CREATE UNIQUE INDEX "PublishedLesson_publishedModuleId_position_key" ON "PublishedLesson"("publishedModuleId", "position");
CREATE INDEX "PublishedLesson_lessonId_courseId_idx" ON "PublishedLesson"("lessonId", "courseId");
ALTER TABLE "PublishedLesson" ADD CONSTRAINT "PublishedLesson_publishedModuleId_releaseId_courseId_fkey" FOREIGN KEY ("publishedModuleId", "releaseId", "courseId") REFERENCES "PublishedModule"("id", "releaseId", "courseId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PublishedLesson" ADD CONSTRAINT "PublishedLesson_lessonId_courseId_fkey" FOREIGN KEY ("lessonId", "courseId") REFERENCES "Lesson"("id", "courseId") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE "PublishedClassification" (
 "releaseId" UUID NOT NULL,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('CATEGORY','LEVEL','CURRICULUM','SUBJECT')),
 "key" TEXT NOT NULL CHECK ("key" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("key") <= 120),
 "name" TEXT NOT NULL CHECK (char_length(btrim("name")) BETWEEN 1 AND 200),
 "isPrimary" BOOLEAN NOT NULL DEFAULT false CHECK (NOT "isPrimary" OR "kind" IN ('CATEGORY','SUBJECT')),
 PRIMARY KEY ("releaseId","kind","key")
);
CREATE UNIQUE INDEX "PublishedClassification_one_primary" ON "PublishedClassification"("releaseId","kind") WHERE "isPrimary";
ALTER TABLE "PublishedClassification" ADD CONSTRAINT "PublishedClassification_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "CourseRelease"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE "PublishedCourseResource" (
 "id" UUID NOT NULL DEFAULT uuidv7() PRIMARY KEY,
 "releaseId" UUID NOT NULL,
 "resourceId" UUID NOT NULL,
 "sourceKey" TEXT NOT NULL CHECK ("sourceKey" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("sourceKey") <= 120),
 "title" TEXT NOT NULL CHECK (char_length(btrim("title")) BETWEEN 1 AND 300),
 "position" INTEGER NOT NULL CHECK ("position" >= 0),
 "mimeType" TEXT NOT NULL CHECK ("mimeType" IN ('application/pdf','text/plain','image/png','image/jpeg','image/webp')),
 "sizeBytes" INTEGER NOT NULL CHECK ("sizeBytes" BETWEEN 1 AND 25000000),
 "sha256" TEXT NOT NULL CHECK ("sha256" ~ '^[a-f0-9]{64}$')
);
CREATE UNIQUE INDEX "PublishedCourseResource_releaseId_resourceId_key" ON "PublishedCourseResource"("releaseId", "resourceId");
CREATE UNIQUE INDEX "PublishedCourseResource_releaseId_position_key" ON "PublishedCourseResource"("releaseId", "position");
CREATE INDEX "PublishedCourseResource_resourceId_idx" ON "PublishedCourseResource"("resourceId");
CREATE INDEX "PublishedCourseResource_sha256_idx" ON "PublishedCourseResource"("sha256");
ALTER TABLE "PublishedCourseResource" ADD CONSTRAINT "PublishedCourseResource_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "CourseRelease"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PublishedCourseResource" ADD CONSTRAINT "PublishedCourseResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LearningResource"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE "PublishedLessonResource" (
 "id" UUID NOT NULL DEFAULT uuidv7() PRIMARY KEY,
 "releaseId" UUID NOT NULL,
 "publishedLessonId" UUID NOT NULL,
 "resourceId" UUID NOT NULL,
 "sourceKey" TEXT NOT NULL CHECK ("sourceKey" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("sourceKey") <= 120),
 "title" TEXT NOT NULL CHECK (char_length(btrim("title")) BETWEEN 1 AND 300),
 "position" INTEGER NOT NULL CHECK ("position" >= 0),
 "mimeType" TEXT NOT NULL CHECK ("mimeType" IN ('application/pdf','text/plain','image/png','image/jpeg','image/webp')),
 "sizeBytes" INTEGER NOT NULL CHECK ("sizeBytes" BETWEEN 1 AND 25000000),
 "sha256" TEXT NOT NULL CHECK ("sha256" ~ '^[a-f0-9]{64}$')
);
CREATE UNIQUE INDEX "PublishedLessonResource_publishedLessonId_resourceId_key" ON "PublishedLessonResource"("publishedLessonId", "resourceId");
CREATE UNIQUE INDEX "PublishedLessonResource_publishedLessonId_position_key" ON "PublishedLessonResource"("publishedLessonId", "position");
CREATE INDEX "PublishedLessonResource_resourceId_idx" ON "PublishedLessonResource"("resourceId");
CREATE INDEX "PublishedLessonResource_releaseId_idx" ON "PublishedLessonResource"("releaseId");
CREATE INDEX "PublishedLessonResource_sha256_idx" ON "PublishedLessonResource"("sha256");
ALTER TABLE "PublishedLessonResource" ADD CONSTRAINT "PublishedLessonResource_publishedLessonId_releaseId_fkey" FOREIGN KEY ("publishedLessonId", "releaseId") REFERENCES "PublishedLesson"("id", "releaseId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PublishedLessonResource" ADD CONSTRAINT "PublishedLessonResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LearningResource"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- Only an unpublished staged release can receive child rows. All snapshot
-- rows and approved metadata are immutable, including after withdrawal.
CREATE FUNCTION guard_academic_release() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'academic_release_immutable' USING ERRCODE = '23514'; END IF;
 IF TG_OP = 'INSERT' THEN
   IF NEW."state" <> 'STAGED' THEN RAISE EXCEPTION 'academic_release_requires_staging' USING ERRCODE = '23514'; END IF;
   RETURN NEW;
 END IF;
 IF (to_jsonb(NEW) - ARRAY['state','retiredAt']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['state','retiredAt']) THEN
   RAISE EXCEPTION 'academic_release_immutable' USING ERRCODE = '23514';
 END IF;
 IF OLD."state" = 'STAGED' AND NEW."state" = 'ACTIVE' THEN
   IF NOT EXISTS (SELECT 1 FROM "Course" c WHERE c."id"=NEW."courseId" AND c."archivedAt" IS NULL AND c."slug"=NEW."slug" AND c."sourceKey"=NEW."sourceKey")
      OR NOT EXISTS (SELECT 1 FROM "PublishedModule" m WHERE m."releaseId"=NEW."id")
      OR EXISTS (SELECT 1 FROM "PublishedModule" m WHERE m."releaseId"=NEW."id" AND NOT EXISTS (SELECT 1 FROM "PublishedLesson" l WHERE l."publishedModuleId"=m."id"))
      OR NOT EXISTS (SELECT 1 FROM "PublishedClassification" x WHERE x."releaseId"=NEW."id" AND x."kind"='SUBJECT' AND x."isPrimary" AND x."name"=NEW."subject") THEN
     RAISE EXCEPTION 'academic_release_incomplete' USING ERRCODE = '23514';
   END IF;
   RETURN NEW;
 END IF;
 IF OLD."state"='ACTIVE' AND NEW."state" IN ('SUPERSEDED','WITHDRAWN') THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'academic_release_invalid_transition' USING ERRCODE = '23514';
END $$;
CREATE TRIGGER "CourseRelease_guard" BEFORE INSERT OR UPDATE OR DELETE ON "CourseRelease" FOR EACH ROW EXECUTE FUNCTION guard_academic_release();

CREATE FUNCTION guard_academic_snapshot() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE release_state TEXT;
BEGIN
 IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'academic_snapshot_immutable' USING ERRCODE = '23514'; END IF;
 SELECT "state" INTO release_state FROM "CourseRelease" WHERE "id"=NEW."releaseId" FOR UPDATE;
 IF release_state IS DISTINCT FROM 'STAGED' THEN RAISE EXCEPTION 'academic_snapshot_requires_staging' USING ERRCODE = '23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "PublishedModule_guard" BEFORE INSERT OR UPDATE OR DELETE ON "PublishedModule" FOR EACH ROW EXECUTE FUNCTION guard_academic_snapshot();
CREATE TRIGGER "PublishedLesson_guard" BEFORE INSERT OR UPDATE OR DELETE ON "PublishedLesson" FOR EACH ROW EXECUTE FUNCTION guard_academic_snapshot();
CREATE TRIGGER "PublishedClassification_guard" BEFORE INSERT OR UPDATE OR DELETE ON "PublishedClassification" FOR EACH ROW EXECUTE FUNCTION guard_academic_snapshot();
CREATE TRIGGER "PublishedCourseResource_guard" BEFORE INSERT OR UPDATE OR DELETE ON "PublishedCourseResource" FOR EACH ROW EXECUTE FUNCTION guard_academic_snapshot();
CREATE TRIGGER "PublishedLessonResource_guard" BEFORE INSERT OR UPDATE OR DELETE ON "PublishedLessonResource" FOR EACH ROW EXECUTE FUNCTION guard_academic_snapshot();

CREATE FUNCTION guard_academic_course_identity() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW."slug" IS DISTINCT FROM OLD."slug" OR NEW."sourceKey" IS DISTINCT FROM OLD."sourceKey") AND EXISTS (SELECT 1 FROM "CourseRelease" WHERE "courseId"=OLD."id") THEN RAISE EXCEPTION 'published_course_identity_immutable' USING ERRCODE='23514'; END IF;
 IF NEW."archivedAt" IS NOT NULL AND EXISTS (SELECT 1 FROM "CourseRelease" WHERE "courseId"=OLD."id" AND "state"='ACTIVE') THEN RAISE EXCEPTION 'withdraw_before_archive' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "Course_published_identity_guard" BEFORE UPDATE ON "Course" FOR EACH ROW EXECUTE FUNCTION guard_academic_course_identity();
CREATE FUNCTION guard_academic_lesson_identity() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW."slug" IS DISTINCT FROM OLD."slug" OR NEW."sourceKey" IS DISTINCT FROM OLD."sourceKey" OR NEW."courseId" IS DISTINCT FROM OLD."courseId") AND EXISTS (SELECT 1 FROM "PublishedLesson" WHERE "lessonId"=OLD."id") THEN RAISE EXCEPTION 'published_lesson_identity_immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "Lesson_published_identity_guard" BEFORE UPDATE ON "Lesson" FOR EACH ROW EXECUTE FUNCTION guard_academic_lesson_identity();
CREATE FUNCTION guard_academic_module_identity() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW."sourceKey" IS DISTINCT FROM OLD."sourceKey" OR NEW."courseId" IS DISTINCT FROM OLD."courseId") AND EXISTS (SELECT 1 FROM "PublishedModule" WHERE "moduleId"=OLD."id") THEN RAISE EXCEPTION 'published_module_identity_immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "Module_published_identity_guard" BEFORE UPDATE ON "Module" FOR EACH ROW EXECUTE FUNCTION guard_academic_module_identity();
COMMIT;
