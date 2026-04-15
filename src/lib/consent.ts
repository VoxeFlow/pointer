export const DEVICE_CONSENT_VERSION = "2026-04-12-v2";
export const IMAGE_CONSENT_VERSION = "2026-04-12-v1";

export type ConsentSection = {
  title: string;
  items: string[];
};

export function getOperationalConsentSections(): ConsentSection[] {
  return [
    {
      title: "Uso do sistema e do aparelho",
      items: [
        "Declaro ciência de que o Pointer é o sistema adotado pela empresa para registro eletrônico de jornada no estabelecimento.",
        "Autorizo o uso do meu aparelho celular, de forma operacional e voluntária, para registrar ponto no Pointer enquanto houver consentimento ativo.",
        "Estou ciente de que posso revogar esse consentimento no app, sabendo que o registro por celular ficará indisponível até nova concordância ou orientação da empresa.",
      ],
    },
    {
      title: "Câmera, localização e logs técnicos",
      items: [
        "Estou ciente de que o registro de ponto pode exigir foto, geolocalização, horário do servidor, dados do navegador, dispositivo e logs técnicos de falha para garantir autenticidade, rastreabilidade e prevenção a fraude.",
        "A foto capturada no momento da marcação será vinculada ao evento de ponto correspondente e usada para auditoria, comprovação e segurança operacional.",
        "A localização geográfica é usada exclusivamente para validar o local da marcação e para auditoria do registro.",
      ],
    },
    {
      title: "Jornada, atrasos, faltas e ajustes",
      items: [
        "Estou ciente da minha carga horária, dos horários de entrada, saída e intervalo definidos pela empresa, conforme contrato, escala e legislação aplicável.",
        "Atrasos, ausências, saídas antecipadas, faltas de marcação ou marcações incompletas poderão ser identificados pelo sistema e analisados administrativamente.",
        "Eventuais correções de ponto não substituem a marcação original de forma silenciosa, sendo tratadas por ajuste auditado com preservação de histórico, motivo, data e responsável.",
      ],
    },
    {
      title: "Atestados e justificativas",
      items: [
        "Estou ciente de que atestados, declarações e justificativas devem ser enviados pelo próprio sistema ou apresentados pelos canais definidos pela empresa, dentro do prazo interno aplicável.",
        "Dados de saúde vinculados a atestados são tratados com acesso restrito e finalidade administrativa, trabalhista e de cumprimento de obrigação legal, nos termos da LGPD.",
        "Estou ciente de que comunicações sobre férias, afastamentos, feriados, escalas e demais ocorrências da jornada poderão ser disponibilizadas digitalmente no sistema ou pelos canais internos da empresa.",
      ],
    },
    {
      title: "Contracheque e documentos de folha",
      items: [
        "Estou ciente de que contracheques e comprovantes trabalhistas poderão ser disponibilizados digitalmente no Pointer, em área individual e protegida por login pessoal.",
        "Comprometo-me a manter sigilo sobre meu acesso e não compartilhar login, senha ou documentos de folha com terceiros.",
      ],
    },
    {
      title: "Conduta, internet e notificações",
      items: [
        "Comprometo-me a usar o Pointer, a internet do estabelecimento e os recursos tecnológicos disponibilizados apenas para fins profissionais e operacionais relacionados ao trabalho.",
        "Estou ciente de que notificações e lembretes do app possuem caráter auxiliar e não substituem minha responsabilidade de concluir corretamente o registro da jornada.",
        "É vedado registrar ponto para outra pessoa, compartilhar acesso, manipular foto, local, horário ou qualquer elemento de validação do sistema.",
      ],
    },
    {
      title: "Privacidade e LGPD",
      items: [
        "Estou ciente de que meus dados pessoais tratados no Pointer podem incluir identificação, registros de jornada, fotos de marcação, localização, dados técnicos de acesso, atestados e documentos de folha, sempre para finalidades trabalhistas, administrativas, de segurança e exercício regular de direitos.",
        "A empresa deverá tratar esses dados conforme a LGPD e a legislação trabalhista aplicável, com acesso restrito a pessoas autorizadas e guarda adequada das informações.",
      ],
    },
  ];
}

export function getOperationalConsentText() {
  return getOperationalConsentSections().flatMap((section) => [
    section.title,
    ...section.items,
  ]);
}

export function getImageConsentText() {
  return [
    "Autorizo, de forma opcional e revogável, o uso da minha imagem pela empresa em materiais internos, treinamentos, mural, comunicação institucional e divulgação, conforme política interna aplicável.",
    "Estou ciente de que esta autorização é independente da foto tirada para o registro de ponto, que possui finalidade operacional, de auditoria e segurança.",
    "Posso revogar esta autorização no próprio app a qualquer momento, sem afetar a validade do consentimento operacional do sistema de ponto.",
  ];
}

export function hasActiveDeviceConsent(input: {
  deviceConsentAcceptedAt?: Date | null;
  deviceConsentRevokedAt?: Date | null;
  deviceConsentVersion?: string | null;
}) {
  if (!input.deviceConsentAcceptedAt) return false;
  if (input.deviceConsentVersion !== DEVICE_CONSENT_VERSION) return false;
  if (input.deviceConsentRevokedAt && input.deviceConsentRevokedAt >= input.deviceConsentAcceptedAt) return false;
  return true;
}

export function hasActiveImageConsent(input: {
  imageConsentAcceptedAt?: Date | null;
  imageConsentRevokedAt?: Date | null;
  imageConsentVersion?: string | null;
}) {
  if (!input.imageConsentAcceptedAt) return false;
  if (input.imageConsentVersion !== IMAGE_CONSENT_VERSION) return false;
  if (input.imageConsentRevokedAt && input.imageConsentRevokedAt >= input.imageConsentAcceptedAt) return false;
  return true;
}
