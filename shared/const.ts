export const COOKIE_NAME = "webdev_app_session";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
export const OAUTH_STATE_COOKIE = "__Host-oauth_state";
export type OAuthState = { redirectUri: string; nonce?: string };
export const encodeOAuthState = (state: OAuthState): string => btoa(JSON.stringify(state));
export const decodeOAuthState = (state: string): OAuthState => {
  let decoded: string;
  try { decoded = atob(state); } catch { return { redirectUri: "" }; }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {}
  return { redirectUri: decoded };
};

// Substitua estes três valores pelos seus contactos reais antes de publicar.
export const CONTACT = {
  name: "Jean Durgante",
  email: "jean.d.serres@gmail.com",
  instagram: "@seu_perfil",
  whatsappDisplay: "(51) 98168-1426",
  whatsappNumber: "5551981681426",
};

export const DEFAULT_SERVICES = [
  { id: 1, slug: "informatica", name: "Manutenção de computadores", category: "Informática", description: "Hardware, software, limpeza, formatação, upgrades e otimização.", icon: "cpu", priceFrom: 120, priceMode: "from" as const },
  { id: 2, slug: "games", name: "Desbloqueio & games", category: "Entretenimento digital", description: "Desbloqueio de consoles e instalação de bibliotecas de jogos.", icon: "gamepad-2", priceFrom: 180, priceMode: "from" as const },
  { id: 3, slug: "ponto", name: "Ponto eletrônico", category: "Gestão de ponto", description: "Relógios cartográficos, Control iD e apoio no fechamento de folha.", icon: "timer-reset", priceFrom: 150, priceMode: "from" as const },
  { id: 4, slug: "consultoria", name: "RHiD & Secullum Web", category: "Consultoria", description: "Consultoria prática para fechamento e organização do RH.", icon: "workflow", priceFrom: 200, priceMode: "from" as const },
  { id: 5, slug: "cameras", name: "Câmeras de segurança", category: "Segurança eletrônica", description: "Instalação, configuração e orientação para monitoramento.", icon: "camera", priceFrom: null, priceMode: "quote" as const },
  { id: 6, slug: "externos", name: "Serviços externos", category: "Manutenção geral", description: "Poda de árvores de pequeno porte e reparos diversos.", icon: "trees", priceFrom: 100, priceMode: "from" as const },
];
