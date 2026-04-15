import { db } from "@/lib/db";
import { ensurePushSchema } from "@/lib/push-schema";
import { getBrasiliaDayBounds, getRealtimeAttendanceIssue } from "@/lib/time";
import { sendWebPushNotification } from "@/lib/web-push";

function getBrasiliaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export const pushReminderService = {
  async sendRealtimeAttendanceReminders(date = new Date()) {
    await ensurePushSchema();
    const { start, end } = getBrasiliaDayBounds(date);
    const issueDateKey = getBrasiliaDateKey(date);

    const employees = await db.user.findMany({
      where: {
        role: "EMPLOYEE",
        isActive: true,
        organization: {
          status: {
            in: ["TRIAL", "ACTIVE"],
          },
        },
        pushSubscriptions: {
          some: {
            isActive: true,
          },
        },
      },
      include: {
        organization: {
          select: {
            name: true,
          },
        },
        schedule: {
          include: {
            weekdays: true,
          },
        },
        timeRecords: {
          where: {
            isDisregarded: false,
            serverTimestamp: {
              gte: start,
              lte: end,
            },
          },
          orderBy: {
            serverTimestamp: "asc",
          },
        },
        pushSubscriptions: {
          where: {
            isActive: true,
          },
        },
      },
    });

    const results: Array<{
      userId: string;
      issueCode: string;
      sent: number;
      deactivated: number;
    }> = [];

    for (const employee of employees) {
      const issue = getRealtimeAttendanceIssue(employee.timeRecords, employee.schedule, date);

      if (!issue) {
        continue;
      }

      let sent = 0;
      let deactivated = 0;

      for (const subscription of employee.pushSubscriptions) {
        const alreadySent = await db.pushReminderDelivery.findUnique({
          where: {
            subscriptionId_issueCode_issueDateKey: {
              subscriptionId: subscription.id,
              issueCode: issue.code,
              issueDateKey,
            },
          },
        });

        if (alreadySent) {
          continue;
        }

        try {
          await sendWebPushNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            {
              title: `Pointer: ${issue.title}`,
              body: issue.description,
              href: "/employee",
              tag: `${issue.code}:${issueDateKey}`,
              organization: employee.organization.name,
            },
          );

          await db.pushReminderDelivery.create({
            data: {
              organizationId: employee.organizationId,
              userId: employee.id,
              subscriptionId: subscription.id,
              issueCode: issue.code,
              issueDateKey,
            },
          });

          sent += 1;
        } catch (error) {
          const statusCode = typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : null;

          if (statusCode === 404 || statusCode === 410) {
            await db.pushSubscription.update({
              where: { id: subscription.id },
              data: {
                isActive: false,
              },
            });
            deactivated += 1;
          }
        }
      }

      if (sent > 0 || deactivated > 0) {
        results.push({
          userId: employee.id,
          issueCode: issue.code,
          sent,
          deactivated,
        });
      }
    }

    return results;
  },
};
