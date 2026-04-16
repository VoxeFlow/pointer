import { db } from "@/lib/db";

export const userRepository = {
  findByEmail(email: string) {
    return db.user.findUnique({
      where: { email },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
        passwordHash: true,
        mustChangePassword: true,
        role: true,
        isActive: true,
        organization: {
          select: {
            id: true,
            slug: true,
            status: true,
          },
        },
      },
    });
  },
  findByEmailAndOrganizationSlug(email: string, slug: string) {
    return db.user.findFirst({
      where: {
        email,
        organization: {
          slug,
        },
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
        passwordHash: true,
        mustChangePassword: true,
        role: true,
        isActive: true,
        organization: {
          select: {
            id: true,
            slug: true,
            status: true,
          },
        },
      },
    });
  },
  findById(id: string) {
    return db.user.findUnique({
      where: { id },
      include: {
        organization: true,
        schedule: true,
      },
    });
  },
  listEmployees(organizationId: string) {
    return db.user.findMany({
      where: {
        organizationId,
        role: "EMPLOYEE",
      },
      include: {
        schedule: true,
        timeRecords: {
          orderBy: { serverTimestamp: "desc" },
          take: 4,
        },
      },
      orderBy: { name: "asc" },
    });
  },
};
