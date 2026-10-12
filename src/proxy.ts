import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");
  // Endpoint chamado diretamente por terminais físicos de picagem — não tem
  // (nem pode ter) uma sessão de browser autenticada; a autenticação é feita
  // pelo próprio token do equipamento na rota (ver Equipment.webhookToken).
  const isPicagensWebhook = req.nextUrl.pathname.startsWith("/api/picagens/webhook/");
  // A app mobile autentica-se com o seu próprio JWT (Authorization: Bearer),
  // nunca com a sessão de browser do NextAuth — cada rota em
  // `/api/mobile/**` valida esse token por si própria (ver lib/mobile).
  const isMobileApi = req.nextUrl.pathname.startsWith("/api/mobile/");
  const isChangePasswordPage = req.nextUrl.pathname.startsWith("/alterar-password");

  if (isAuthApi || isPicagensWebhook || isMobileApi) return NextResponse.next();

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  if (
    isLoggedIn &&
    req.auth?.user?.mustChangePassword &&
    !isChangePasswordPage
  ) {
    return NextResponse.redirect(new URL("/alterar-password", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
