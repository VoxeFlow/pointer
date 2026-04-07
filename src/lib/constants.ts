export const SESSION_COOKIE_NAME = "pointer_session";
export const RECORD_SEQUENCE = ["ENTRY", "BREAK_OUT", "BREAK_IN", "EXIT"] as const;

export const roleLabels = {
  ADMIN: "Administrador",
  EMPLOYEE: "Funcionario",
};

export const recordTypeLabels = {
  ENTRY: "Entrada",
  BREAK_OUT: "Saida para intervalo",
  BREAK_IN: "Retorno do intervalo",
  EXIT: "Saida final",
};
