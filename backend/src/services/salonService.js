const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// utils : pour générer un codeAcces
function generateCodeAcces() {
  return Math.random().toString(36).substring(2, 8);
}

/* déjà existant : getAllSalons / createSalon / getSalonByCode / joinSalon ... */

exports.getAllSalons = () => prisma.salon.findMany();

exports.createSalon = async ({ nomSalon, pinRequis = false, codePIN = null }) => {
  const codeAcces = generateCodeAcces();
  return prisma.salon.create({
    data: {
      codeAcces,
      nomSalon,
      pinRequis,
      codePIN: pinRequis ? codePIN : null,
    },
  });
};

exports.getSalonByCode = (codeAcces) =>
  prisma.salon.findUnique({ where: { codeAcces } });

exports.joinSalon = async ({ codeAcces, pseudo, codePIN }) => {
  const salon = await prisma.salon.findUnique({
    where: { codeAcces },
    include: { participants: true },
  });
  if (!salon) {
    const err = new Error("Salon introuvable");
    err.name = "NOT_FOUND";
    throw err;
  }

  if (salon.pinRequis && salon.codePIN !== codePIN) {
    const err = new Error("Code PIN incorrect");
    err.name = "PIN_ERROR";
    throw err;
  }

  const participant = await prisma.participant.create({
    data: {
      pseudo,
      salonId: salon.id,
    },
  });

  const participants = await prisma.participant.findMany({
    where: { salonId: salon.id, connected: true },
  });

  return { salon, participant, participants };
};

/*  QUITTER UN SALON  */
exports.leaveSalon = async ({ codeAcces, participantId }) => {
  const salon = await prisma.salon.findUnique({ where: { codeAcces } });
  if (!salon) {
    const err = new Error("Salon introuvable");
    err.name = "NOT_FOUND";
    throw err;
  }

  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
  });
  if (!participant || participant.salonId !== salon.id) {
    const err = new Error("Participant introuvable dans ce salon");
    err.name = "NOT_FOUND";
    throw err;
  }

  await prisma.participant.update({
    where: { id: participantId },
    data: { connected: false },
  });

  return { success: true };
};

/*  RÉCUPÉRER L’ÉTAT COMPLET  */
exports.getSalonState = async (codeAcces) => {
  const salon = await prisma.salon.findUnique({
    where: { codeAcces },
  });
  if (!salon) return null;

  const [participants, playlist, historique] = await Promise.all([
    prisma.participant.findMany({
      where: { salonId: salon.id, connected: true },
    }),
    prisma.playlistItem.findMany({
      where: { salonId: salon.id },
      orderBy: { ordre: "asc" },
    }),
    prisma.historique.findMany({
      where: { salonId: salon.id },
      orderBy: { viewedAt: "desc" },
    }),
  ]);

  return { salon, participants, playlist, historique };
};

/*  METTRE À JOUR L’ÉTAT VIDÉO  */
exports.updateSalonState = async (codeAcces, { position, lecture, vitesse }) => {
  const salon = await prisma.salon.findUnique({ where: { codeAcces } });
  if (!salon) return null;

  return prisma.salon.update({
    where: { id: salon.id },
    data: {
      position: position ?? salon.position,
      lecture: typeof lecture === "boolean" ? lecture : salon.lecture,
      vitesse: vitesse ?? salon.vitesse,
    },
  });
};

/*  SUPPRIMER UN SALON  */
exports.deleteSalon = async (codeAcces) => {
  const salon = await prisma.salon.findUnique({ where: { codeAcces } });
  if (!salon) {
    const err = new Error("Salon introuvable");
    err.name = "NOT_FOUND";
    throw err;
  }

  // on supprime d’abord les entités liées (ordre important)
  await prisma.message.deleteMany({ where: { salonId: salon.id } });
  await prisma.playlistItem.deleteMany({ where: { salonId: salon.id } });
  await prisma.historique.deleteMany({ where: { salonId: salon.id } });
  await prisma.participant.deleteMany({ where: { salonId: salon.id } });

  await prisma.salon.delete({ where: { id: salon.id } });
};
