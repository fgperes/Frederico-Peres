import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const ISSUER = "people4people-mobile";
const EXPIRES_IN = "30d";

// Segredo dedicado à app mobile — nunca o mesmo que o AUTH_SECRET do
// NextAuth, para que revogar/rodar um não afete o outro (ex.: trocar este
// segredo termina sessão de todos os telemóveis sem fazer logout na web).
// Lido e validado só quando efetivamente precisamos de assinar/verificar um
// token (nunca ao nível do módulo) — o `next build` importa todas as rotas
// para recolher metadados, e um `throw` ao nível do módulo rebentaria esse
// passo mesmo sem nenhum pedido real a acontecer.
function getSecret(): Uint8Array {
  const value = process.env.MOBILE_JWT_SECRET;
  if (!value) {
    throw new Error("MOBILE_JWT_SECRET não definida.");
  }
  return new TextEncoder().encode(value);
}

export type MobileTokenPayload = JWTPayload & {
  userId: string;
  employeeId: string;
};

export async function signMobileToken(payload: { userId: string; employeeId: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecret());
}

export async function verifyMobileToken(token: string): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { issuer: ISSUER });
    if (typeof payload.userId !== "string" || typeof payload.employeeId !== "string") return null;
    return payload as MobileTokenPayload;
  } catch {
    return null;
  }
}
