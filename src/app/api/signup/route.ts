import { NextResponse } from "next/server";

import { assertRateLimit } from "@/lib/rate-limit";
import { signupService } from "@/services/signup-service";
import { signupSchema } from "@/validations/signup";

export async function POST(request: Request) {
  try {
    const payload = signupSchema.parse(await request.json());
    assertRateLimit(`signup:${payload.adminEmail}`, 5, 60_000);

    await signupService.createTrialOrganization(payload);

    return NextResponse.json({
      success: true,
      redirectTo: "/admin",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao foi possivel iniciar o trial.",
      },
      { status: 400 },
    );
  }
}
