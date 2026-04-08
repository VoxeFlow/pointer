import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadPhoto } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Sessão expirada ou acesso negado." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("logo");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Nenhum arquivo de logo fornecido." }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "O formato do arquivo deve ser PNG, JPEG, WEBP ou SVG." }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "O tamanho máximo permitido é de 2MB." }, { status: 400 });
    }

    const photoResult = await uploadPhoto(file, `logo-${session.organizationSlug}-${Date.now()}`);

    return NextResponse.json({
      success: true,
      url: photoResult.url
    });
  } catch (error) {
    console.error("[LOGO_UPLOAD_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno ao processar e salvar a logo." },
      { status: 500 }
    );
  }
}
