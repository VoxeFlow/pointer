import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { adminUserService } from "@/services/admin-user-service";
import { updateEmployeeSchema } from "@/validations/admin-user";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const { id } = await params;
    const raw = (await request.json()) as Record<string, unknown>;

    if (raw.toggleStatusOnly) {
      const employee = await adminUserService.toggleEmployeeStatus(id, session.sub, session.organizationId);
      return NextResponse.json({ success: true, isActive: employee.isActive });
    }

    const payload = updateEmployeeSchema.parse(raw);
    const employee = await adminUserService.updateEmployee(id, {
      actorUserId: session.sub,
      organizationId: session.organizationId,
      ...payload,
      password: payload.password || undefined,
    });

    return NextResponse.json({
      success: true,
      id: employee.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao foi possivel atualizar o funcionario.",
      },
      { status: 400 },
    );
  }
}
