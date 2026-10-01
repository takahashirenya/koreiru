export const images = {
  select: { id: true, displayOrder: true },
  orderBy: { displayOrder: "asc" as const },
};
export const wishes = {
  select: {
    id: true,
    requesterName: true,
    contact: true,
    message: true,
    status: true,
    createdAt: true,
  },
  orderBy: { createdAt: "asc" as const },
};
export const publicItem = {
  id: true,
  name: true,
  description: true,
  quantity: true,
  status: true,
  pickupNote: true,
  images,
  _count: {
    select: {
      requests: {
        where: {
          status: { in: ["pending", "selected"] as ("pending" | "selected")[] },
        },
      },
    },
  },
};
export const publicBoard = {
  id: true,
  title: true,
  description: true,
  expiresAt: true,
  isActive: true,
  items: { select: publicItem, orderBy: { createdAt: "desc" as const } },
};
