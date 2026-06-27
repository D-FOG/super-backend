import type { RoleName } from "../constants/roles";

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      email: string;
      roles: RoleName[];
      clusterCenterId?: string;
    }

    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
