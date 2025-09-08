import { PrismaClient } from "../../generated/prisma/index.js";

const g = globalThis;
const prisma = g.__fwzmPrisma ?? new PrismaClient();
if (!g.__fwzmPrisma) g.__fwzmPrisma = prisma;

export async function findById(id) {
  return prisma.restaurants.findUnique({ where: { id } });
}

export async function findByTelephone(telephone) {
  if (!telephone) return null;
  return prisma.restaurants.findFirst({ where: { telephone } });
}

/** mapx/mapy 정수 좌표 박스(+-delta)로 근접 후보 조회 */
export async function findNearbyBBox(mapx, mapy, delta = 7000) {
  if (!Number.isFinite(mapx) || !Number.isFinite(mapy)) return [];
  return prisma.restaurants.findMany({
    where: {
      mapx: { gte: mapx - delta, lte: mapx + delta },
      mapy: { gte: mapy - delta, lte: mapy + delta },
    },
    take: 20,
  });
}

export async function createRestaurant(data) {
  return prisma.restaurants.create({ data });
}

export async function updateRestaurant(id, data) {
  return prisma.restaurants.update({ where: { id }, data });
}
