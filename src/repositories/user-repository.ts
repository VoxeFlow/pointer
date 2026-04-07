import { db } from "@/lib/db";

export const userRepository = {
  findByEmail(email: string) {
    return db.user.findUnique({
      where: { email },
      include: {
        organization: true,
        schedule: true,
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
      include: {
        organization: true,
        schedule: true,
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
