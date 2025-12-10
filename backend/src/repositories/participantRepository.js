const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function creerParticipant({ pseudo, salonId }) {
  return prisma.participant.create({
    data: {
      pseudo,
      salonId,
      connected: true,
    },
  });
}

async function listerParticipantsParSalon(salonId) {
  return prisma.participant.findMany({
    where: { salonId, connected: true },
    orderBy: { id: "asc" },
  });
}

module.exports = {
  creerParticipant,
  listerParticipantsParSalon,
};
