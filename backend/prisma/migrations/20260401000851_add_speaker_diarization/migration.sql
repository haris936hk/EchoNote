-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "speakerMap" JSONB,
ADD COLUMN     "transcriptSegments" JSONB;
