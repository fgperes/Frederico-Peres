import type { Role } from "@/lib/roles";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: Role[];
      employeeId: string | null;
      mustChangePassword: boolean;
      canPublishNews: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    roles: Role[];
    employeeId: string | null;
    mustChangePassword: boolean;
    canPublishNews: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roles: Role[];
    employeeId: string | null;
    mustChangePassword: boolean;
    canPublishNews: boolean;
  }
}
