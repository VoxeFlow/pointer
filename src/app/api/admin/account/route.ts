import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { createSession, getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLogRepository } from "@/repositories/audit-log-repository";
import { adminAccountSettingsSchema } from "@/validations/admin-account";

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const payload = adminAccountSettingsSchema.parse(await request.json());
    const currentUser = await db.user.findUniqueOrThrow({
      where: { id: session.sub },
      include: {
        organization: true,
      },
    });

    const currentPasswordValid = await verifyPassword(payload.currentPassword, currentUser.passwordHash);

    if (!currentPasswordValid) {
      return NextResponse.json({ error: "A senha atual esta incorreta." }, { status: 400 });
    }

    const nextEmail = payload.email.trim().toLowerCase();
    const nextPassword = payload.newPassword?.trim() || null;

    const updateData: Prisma.UserUpdateInput = {
      email: nextEmail,
    };

    if (nextPassword) {
      updateData.passwordHash = await hashPassword(nextPassword);
      updateData.mustChangePassword = false;
    }

    const updatedUser = await db.user.update({
      where: { id: currentUser.id },
      data: updateData,
      include: {
        organization: true,
      },
    });

    await createSession({
      sub: updatedUser.id,
      role: updatedUser.role,
      organizationId: updatedUser.organizationId,
      organizationSlug: updatedUser.organization.slug,
      name: updatedUser.name,
      email: updatedUser.email,
      mustChangePassword: updatedUser.mustChangePassword,
    });

    await auditLogRepository.create({
      organizationId: updatedUser.organizationId,
      actorUserId: updatedUser.id,
      action: "admin_account_credentials_updated",
      targetType: "user",
      targetId: updatedUser.id,
      metadataJson: {
        previousEmail: currentUser.email,
        newEmail: updatedUser.email,
        emailChanged: currentUser.email !== updatedUser.email,
        passwordChanged: Boolean(nextPassword),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "Nao foi possivel validar os dados de acesso.",
        },
        { status: 400 },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Este e-mail ja esta sendo usado por outro usuario." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao foi possivel atualizar o acesso do admin.",
      },
      { status: 400 },
    );
  }
}
