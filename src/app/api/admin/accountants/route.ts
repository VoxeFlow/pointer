import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { auditLogRepository } from "@/repositories/audit-log-repository";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!name || name.length < 3) {
      return NextResponse.json({ error: "Informe o nome completo do contador." }, { status: 400 });
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "Já existe usuário com este e-mail." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const accountant = await db.user.create({
      data: {
        organizationId: session.organizationId,
        name,
        email,
        passwordHash,
        role: "ACCOUNTANT",
        mustChangePassword: true,
        isActive: true,
      },
      select: { id: true, name: true, email: true },
    });

    await auditLogRepository.create({
      organizationId: session.organizationId,
      actorUserId: session.sub,
      action: "accountant_created",
      targetType: "user",
      targetId: accountant.id,
      metadataJson: {
        email: accountant.email,
      },
    });

    return NextResponse.json({ success: true, accountantId: accountant.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel criar o contador." },
      { status: 400 },
    );
  }
}
