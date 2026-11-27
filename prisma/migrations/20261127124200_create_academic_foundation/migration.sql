-- Additive academic authoring foundation. Preserve original User migration and rows.
-- Published content remains on the existing transitional source until cutover.
BEGIN;

DO $$ BEGIN
  IF current_setting('server_version_num')::integer < 180000 THEN
    RAISE EXCEPTION 'Academic schema requires PostgreSQL 18 or newer';
  END IF;
END $$;

CREATE TABLE "Role" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Role_key_check" CHECK ("key" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("key") <= 120),
  CONSTRAINT "Role_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 120)
);

CREATE TABLE "AcademicCategory" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "archivedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AcademicCategory_key_check" CHECK ("key" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("key") <= 120),
  CONSTRAINT "AcademicCategory_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 200)
);

CREATE TABLE "AcademicLevel" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "archivedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicLevel_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AcademicLevel_key_check" CHECK ("key" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("key") <= 120),
  CONSTRAINT "AcademicLevel_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 200)
);

CREATE TABLE "Curriculum" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "archivedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Curriculum_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Curriculum_key_check" CHECK ("key" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("key") <= 120),
  CONSTRAINT "Curriculum_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 200)
);

CREATE TABLE "Subject" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "archivedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subject_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subject_key_check" CHECK ("key" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("key") <= 120),
  CONSTRAINT "Subject_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 200)
);

CREATE TABLE "Topic" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parentId" UUID,
  "archivedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Topic_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Topic_key_check" CHECK ("key" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("key") <= 120),
  CONSTRAINT "Topic_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 200),
  CONSTRAINT "Topic_not_self_check" CHECK ("parentId" IS NULL OR "parentId" <> "id")
);

CREATE TABLE "Course" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "sourceKey" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "audience" TEXT NOT NULL DEFAULT '',
  "archivedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Course_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Course_source_key_check" CHECK ("sourceKey" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("sourceKey") <= 120),
  CONSTRAINT "Course_slug_check" CHECK ("slug" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("slug") <= 120),
  CONSTRAINT "Course_title_check" CHECK (char_length(btrim("title")) BETWEEN 1 AND 300),
  CONSTRAINT "Course_summary_check" CHECK (char_length("summary") <= 10000),
  CONSTRAINT "Course_audience_check" CHECK (char_length("audience") <= 1000)
);

CREATE TABLE "MediaAsset" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "provider" TEXT NOT NULL,
  "externalKey" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "sha256" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MediaAsset_provider_check" CHECK (("provider" = 'YOUTUBE' AND "externalKey" ~ '^[A-Za-z0-9_-]{11}$' AND "mimeType" IS NULL AND "sizeBytes" IS NULL AND "sha256" IS NULL) OR ("provider" = 'LOCAL_PRIVATE' AND "externalKey" ~ '^[a-f0-9]{64}$' AND "sha256" IS NOT NULL AND "sha256" = "externalKey" AND "sizeBytes" IS NOT NULL AND "sizeBytes" BETWEEN 1 AND 25000000 AND "mimeType" IS NOT NULL AND "mimeType" IN ('application/pdf','text/plain','image/png','image/jpeg','image/webp')))
);

CREATE TABLE "LearningResource" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "sourceKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "mediaAssetId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningResource_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningResource_source_key_check" CHECK ("sourceKey" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("sourceKey") <= 120),
  CONSTRAINT "LearningResource_title_check" CHECK (char_length(btrim("title")) BETWEEN 1 AND 300)
);

CREATE TABLE "Module" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "courseId" UUID NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Module_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Module_source_key_check" CHECK ("sourceKey" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("sourceKey") <= 120),
  CONSTRAINT "Module_title_check" CHECK (char_length(btrim("title")) BETWEEN 1 AND 300),
  CONSTRAINT "Module_position_check" CHECK ("position" >= 0)
);

CREATE TABLE "Lesson" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "courseId" UUID NOT NULL,
  "moduleId" UUID NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'TEXT',
  "overview" TEXT NOT NULL DEFAULT '',
  "notesMarkdown" TEXT NOT NULL DEFAULT '',
  "videoAssetId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Lesson_source_key_check" CHECK ("sourceKey" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("sourceKey") <= 120),
  CONSTRAINT "Lesson_slug_check" CHECK ("slug" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length("slug") <= 120),
  CONSTRAINT "Lesson_title_check" CHECK (char_length(btrim("title")) BETWEEN 1 AND 300),
  CONSTRAINT "Lesson_position_check" CHECK ("position" >= 0),
  CONSTRAINT "Lesson_kind_check" CHECK ("kind" IN ('TEXT','VIDEO') AND ("kind" <> 'TEXT' OR "videoAssetId" IS NULL)),
  CONSTRAINT "Lesson_overview_check" CHECK (char_length("overview") <= 10000),
  CONSTRAINT "Lesson_notes_check" CHECK (char_length("notesMarkdown") <= 200000)
);

CREATE TABLE "UserRole" (
  "userId" UUID NOT NULL,
  "roleId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId", "roleId")
);

CREATE TABLE "CourseEducator" (
  "courseId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "permission" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseEducator_pkey" PRIMARY KEY ("courseId", "userId"),
  CONSTRAINT "CourseEducator_permission_check" CHECK ("permission" IN ('EDITOR','REVIEWER','EDITOR_REVIEWER'))
);

CREATE TABLE "CourseCategory" (
  "courseId" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "CourseCategory_pkey" PRIMARY KEY ("courseId", "categoryId")
);

CREATE TABLE "CourseLevel" (
  "courseId" UUID NOT NULL,
  "levelId" UUID NOT NULL,
  CONSTRAINT "CourseLevel_pkey" PRIMARY KEY ("courseId", "levelId")
);

CREATE TABLE "CourseCurriculum" (
  "courseId" UUID NOT NULL,
  "curriculumId" UUID NOT NULL,
  CONSTRAINT "CourseCurriculum_pkey" PRIMARY KEY ("courseId", "curriculumId")
);

CREATE TABLE "CourseSubject" (
  "courseId" UUID NOT NULL,
  "subjectId" UUID NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "CourseSubject_pkey" PRIMARY KEY ("courseId", "subjectId")
);

CREATE TABLE "SubjectTopic" (
  "subjectId" UUID NOT NULL,
  "topicId" UUID NOT NULL,
  CONSTRAINT "SubjectTopic_pkey" PRIMARY KEY ("subjectId", "topicId")
);

CREATE TABLE "LessonTopic" (
  "lessonId" UUID NOT NULL,
  "topicId" UUID NOT NULL,
  CONSTRAINT "LessonTopic_pkey" PRIMARY KEY ("lessonId", "topicId")
);

CREATE TABLE "CourseResource" (
  "courseId" UUID NOT NULL,
  "resourceId" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "CourseResource_pkey" PRIMARY KEY ("courseId", "resourceId"),
  CONSTRAINT "CourseResource_position_check" CHECK ("position" >= 0)
);

CREATE TABLE "LessonResource" (
  "lessonId" UUID NOT NULL,
  "resourceId" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "LessonResource_pkey" PRIMARY KEY ("lessonId", "resourceId"),
  CONSTRAINT "LessonResource_position_check" CHECK ("position" >= 0)
);
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");
CREATE UNIQUE INDEX "AcademicCategory_key_key" ON "AcademicCategory"("key");
CREATE UNIQUE INDEX "AcademicLevel_key_key" ON "AcademicLevel"("key");
CREATE UNIQUE INDEX "Curriculum_key_key" ON "Curriculum"("key");
CREATE UNIQUE INDEX "Subject_key_key" ON "Subject"("key");
CREATE UNIQUE INDEX "Topic_key_key" ON "Topic"("key");
CREATE INDEX "Topic_parentId_idx" ON "Topic"("parentId");
CREATE UNIQUE INDEX "Course_sourceKey_key" ON "Course"("sourceKey");
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
CREATE UNIQUE INDEX "MediaAsset_provider_externalKey_key" ON "MediaAsset"("provider", "externalKey");
CREATE UNIQUE INDEX "LearningResource_sourceKey_key" ON "LearningResource"("sourceKey");
CREATE INDEX "LearningResource_mediaAssetId_idx" ON "LearningResource"("mediaAssetId");
CREATE UNIQUE INDEX "Module_sourceKey_key" ON "Module"("sourceKey");
CREATE UNIQUE INDEX "Module_id_courseId_key" ON "Module"("id", "courseId");
CREATE UNIQUE INDEX "Module_courseId_position_key" ON "Module"("courseId", "position");
CREATE UNIQUE INDEX "Lesson_sourceKey_key" ON "Lesson"("sourceKey");
CREATE UNIQUE INDEX "Lesson_courseId_slug_key" ON "Lesson"("courseId", "slug");
CREATE UNIQUE INDEX "Lesson_moduleId_position_key" ON "Lesson"("moduleId", "position");
CREATE INDEX "Lesson_videoAssetId_idx" ON "Lesson"("videoAssetId");
CREATE INDEX "Lesson_moduleId_courseId_idx" ON "Lesson"("moduleId", "courseId");
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");
CREATE INDEX "CourseEducator_userId_idx" ON "CourseEducator"("userId");
CREATE INDEX "CourseCategory_categoryId_idx" ON "CourseCategory"("categoryId");
CREATE UNIQUE INDEX "CourseCategory_one_primary_idx" ON "CourseCategory"("courseId") WHERE "isPrimary";
CREATE INDEX "CourseLevel_levelId_idx" ON "CourseLevel"("levelId");
CREATE INDEX "CourseCurriculum_curriculumId_idx" ON "CourseCurriculum"("curriculumId");
CREATE INDEX "CourseSubject_subjectId_idx" ON "CourseSubject"("subjectId");
CREATE UNIQUE INDEX "CourseSubject_one_primary_idx" ON "CourseSubject"("courseId") WHERE "isPrimary";
CREATE INDEX "SubjectTopic_topicId_idx" ON "SubjectTopic"("topicId");
CREATE INDEX "LessonTopic_topicId_idx" ON "LessonTopic"("topicId");
CREATE UNIQUE INDEX "CourseResource_courseId_position_key" ON "CourseResource"("courseId", "position");
CREATE INDEX "CourseResource_resourceId_idx" ON "CourseResource"("resourceId");
CREATE UNIQUE INDEX "LessonResource_lessonId_position_key" ON "LessonResource"("lessonId", "position");
CREATE INDEX "LessonResource_resourceId_idx" ON "LessonResource"("resourceId");
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "LearningResource" ADD CONSTRAINT "LearningResource_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_courseId_fkey" FOREIGN KEY ("moduleId", "courseId") REFERENCES "Module"("id", "courseId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CourseEducator" ADD CONSTRAINT "CourseEducator_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CourseEducator" ADD CONSTRAINT "CourseEducator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CourseCategory" ADD CONSTRAINT "CourseCategory_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CourseCategory" ADD CONSTRAINT "CourseCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AcademicCategory"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CourseLevel" ADD CONSTRAINT "CourseLevel_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CourseLevel" ADD CONSTRAINT "CourseLevel_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "AcademicLevel"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CourseCurriculum" ADD CONSTRAINT "CourseCurriculum_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CourseCurriculum" ADD CONSTRAINT "CourseCurriculum_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "Curriculum"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CourseSubject" ADD CONSTRAINT "CourseSubject_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CourseSubject" ADD CONSTRAINT "CourseSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "SubjectTopic" ADD CONSTRAINT "SubjectTopic_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "SubjectTopic" ADD CONSTRAINT "SubjectTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "LessonTopic" ADD CONSTRAINT "LessonTopic_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "LessonTopic" ADD CONSTRAINT "LessonTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CourseResource" ADD CONSTRAINT "CourseResource_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CourseResource" ADD CONSTRAINT "CourseResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LearningResource"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "LessonResource" ADD CONSTRAINT "LessonResource_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "LessonResource" ADD CONSTRAINT "LessonResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LearningResource"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Database-managed timestamps also cover direct SQL and future import tools.
CREATE FUNCTION set_academic_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW."updatedAt" = clock_timestamp();
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Role_updated_at" BEFORE UPDATE ON "Role" FOR EACH ROW EXECUTE FUNCTION set_academic_updated_at();
CREATE TRIGGER "AcademicCategory_updated_at" BEFORE UPDATE ON "AcademicCategory" FOR EACH ROW EXECUTE FUNCTION set_academic_updated_at();
CREATE TRIGGER "AcademicLevel_updated_at" BEFORE UPDATE ON "AcademicLevel" FOR EACH ROW EXECUTE FUNCTION set_academic_updated_at();
CREATE TRIGGER "Curriculum_updated_at" BEFORE UPDATE ON "Curriculum" FOR EACH ROW EXECUTE FUNCTION set_academic_updated_at();
CREATE TRIGGER "Subject_updated_at" BEFORE UPDATE ON "Subject" FOR EACH ROW EXECUTE FUNCTION set_academic_updated_at();
CREATE TRIGGER "Topic_updated_at" BEFORE UPDATE ON "Topic" FOR EACH ROW EXECUTE FUNCTION set_academic_updated_at();
CREATE TRIGGER "Course_updated_at" BEFORE UPDATE ON "Course" FOR EACH ROW EXECUTE FUNCTION set_academic_updated_at();
CREATE TRIGGER "MediaAsset_updated_at" BEFORE UPDATE ON "MediaAsset" FOR EACH ROW EXECUTE FUNCTION set_academic_updated_at();
CREATE TRIGGER "LearningResource_updated_at" BEFORE UPDATE ON "LearningResource" FOR EACH ROW EXECUTE FUNCTION set_academic_updated_at();
CREATE TRIGGER "Module_updated_at" BEFORE UPDATE ON "Module" FOR EACH ROW EXECUTE FUNCTION set_academic_updated_at();
CREATE TRIGGER "Lesson_updated_at" BEFORE UPDATE ON "Lesson" FOR EACH ROW EXECUTE FUNCTION set_academic_updated_at();

COMMIT;
