import nodemailer from "nodemailer";

import { env } from "@/lib/env";

export function getMailer() {
  if (!env.POINTER_SMTP_HOST || !env.POINTER_SMTP_USER || !env.POINTER_SMTP_PASSWORD) {
    throw new Error(
      "SMTP do Pointer nao configurado. Use credenciais exclusivas deste projeto para envio ao contador.",
    );
  }

  return nodemailer.createTransport({
    host: env.POINTER_SMTP_HOST,
    port: env.POINTER_SMTP_PORT,
    secure: env.POINTER_SMTP_SECURE,
    auth: {
      user: env.POINTER_SMTP_USER,
      pass: env.POINTER_SMTP_PASSWORD,
    },
  });
}
