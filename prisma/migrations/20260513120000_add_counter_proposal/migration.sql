-- Counter-proposal times on Event
ALTER TABLE "Event" ADD COLUMN "counterProposalStart" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN "counterProposalEnd" TIMESTAMP(3);
