-- CreateTable
CREATE TABLE "LessonPlan" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "goal" TEXT NOT NULL,
    "weeks" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "studentId" TEXT,
    "tutorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonPlan_studentId_idx" ON "LessonPlan"("studentId");

-- CreateIndex
CREATE INDEX "LessonPlan_tutorId_idx" ON "LessonPlan"("tutorId");

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "TutorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
