import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { createEmployeeSchema } from "@/validations/admin-user";
import { adminUserService } from "@/services/admin-user-service";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const payload = createEmployeeSchema.parse(await request.json());
    const employee = await adminUserService.createEmployee({
      actorUserId: session.sub,
      organizationId: session.organizationId,
      ...payload,
    });

    return NextResponse.json({
      success: true,
      id: employee.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao foi possivel cadastrar o funcionario.",
      },
      { status: 400 },
    );
  }
}
