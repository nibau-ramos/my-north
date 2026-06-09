-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'superseded');

-- AlterTable: add status and resolvedAt
ALTER TABLE "Invite" ADD COLUMN "status" "InviteStatus" NOT NULL DEFAULT 'pending';
ALTER TABLE "Invite" ADD COLUMN "resolvedAt" TIMESTAMP(3);

-- DropIndex: remove unique constraint on fromUserId (users can have many historical invites)
DROP INDEX IF EXISTS "Invite_fromUserId_key";
