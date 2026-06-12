-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('BIMESTRE', 'TRIMESTRE', 'CUATRIMESTRE');

-- CreateTable
CREATE TABLE "academic_configs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "numberOfPeriods" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "evaluation_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_components" (
    "id" SERIAL NOT NULL,
    "subjectAssignmentId" INTEGER NOT NULL,
    "evaluationTypeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "percentage" DOUBLE PRECISION NOT NULL,
    "period" INTEGER NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closeDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_scores" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "evaluationComponentId" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "observations" TEXT,
    "registeredBy" INTEGER,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "component_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "period_averages" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "subjectAssignmentId" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "average" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "closedBy" INTEGER,

    CONSTRAINT "period_averages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "period_closes" (
    "id" SERIAL NOT NULL,
    "subjectAssignmentId" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedBy" INTEGER NOT NULL,

    CONSTRAINT "period_closes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_configs_academicYear_key" ON "academic_configs"("academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_types_name_key" ON "evaluation_types"("name");

-- CreateIndex
CREATE INDEX "evaluation_components_subjectAssignmentId_period_idx" ON "evaluation_components"("subjectAssignmentId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_components_subjectAssignmentId_period_name_key" ON "evaluation_components"("subjectAssignmentId", "period", "name");

-- CreateIndex
CREATE INDEX "component_scores_studentId_idx" ON "component_scores"("studentId");

-- CreateIndex
CREATE INDEX "component_scores_evaluationComponentId_idx" ON "component_scores"("evaluationComponentId");

-- CreateIndex
CREATE UNIQUE INDEX "component_scores_studentId_evaluationComponentId_key" ON "component_scores"("studentId", "evaluationComponentId");

-- CreateIndex
CREATE INDEX "period_averages_subjectAssignmentId_period_idx" ON "period_averages"("subjectAssignmentId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "period_averages_studentId_subjectAssignmentId_period_key" ON "period_averages"("studentId", "subjectAssignmentId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "period_closes_subjectAssignmentId_period_key" ON "period_closes"("subjectAssignmentId", "period");

-- AddForeignKey
ALTER TABLE "evaluation_components" ADD CONSTRAINT "evaluation_components_subjectAssignmentId_fkey" FOREIGN KEY ("subjectAssignmentId") REFERENCES "subject_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_components" ADD CONSTRAINT "evaluation_components_evaluationTypeId_fkey" FOREIGN KEY ("evaluationTypeId") REFERENCES "evaluation_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_scores" ADD CONSTRAINT "component_scores_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_scores" ADD CONSTRAINT "component_scores_evaluationComponentId_fkey" FOREIGN KEY ("evaluationComponentId") REFERENCES "evaluation_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_averages" ADD CONSTRAINT "period_averages_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_averages" ADD CONSTRAINT "period_averages_subjectAssignmentId_fkey" FOREIGN KEY ("subjectAssignmentId") REFERENCES "subject_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_closes" ADD CONSTRAINT "period_closes_subjectAssignmentId_fkey" FOREIGN KEY ("subjectAssignmentId") REFERENCES "subject_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
