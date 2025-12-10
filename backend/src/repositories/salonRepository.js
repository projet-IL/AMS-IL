// src/repositories/salonRepository.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Génère un code d'accès aléatoire de 7 caractères
 */
function genererCodeAcces() {
  return Math.random().toString(36).substring(2, 9); // ex: "adfb31c"
}

async function creerSalon({ nomSalon, pinRequis = false, codePIN = null }) {
  // on génère un codeAcces et on essaye, en cas de collision on retente
  let codeAcces;
  let salon;
  let essais = 0;

  do {
    codeAcces = genererCodeAcces();
    try {
      salon = await prisma.salon.create({
        data: {
          nomSalon,
          codeAcces,
          pinRequis,
          codePIN,
        },
      });
    } catch (err) {
      // si erreur d'unicité sur codeAcces, on retente
      if (
        err.code === "P2002" &&
        err.meta &&
        err.meta.target &&
        err.meta.target.includes("codeAcces")
      ) {
        salon = null;
        essais += 1;
      } else {
        throw err;
      }
    }
  } while (!salon && essais < 5);

  if (!salon) {
    throw new Error("Impossible de générer un code salon unique");
  }

  return salon;
}

async function trouverSalonParCode(codeAcces) {
  return prisma.salon.findUnique({
    where: { codeAcces },
  });
}

async function listerSalons() {
  return prisma.salon.findMany();
}

module.exports = {
  creerSalon,
  trouverSalonParCode,
  listerSalons,
};
