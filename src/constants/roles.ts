export const ROLES = {
  CLUSTER_SUPERVISOR: "Cluster Supervisor",
  CLUSTER_LEADER: "Cluster Leader",
  CLUSTER_MEMBER: "Cluster Member",
  REGISTERED_PARTNER: "Registered Partner",
  FIELD_EVANGELIST: "Field Evangelist"
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_VALUES = Object.values(ROLES) as [RoleName, ...RoleName[]];

export const DEFAULT_ROLE: RoleName = ROLES.CLUSTER_MEMBER;

export const LEADER_ROLES: RoleName[] = [ROLES.CLUSTER_LEADER, ROLES.CLUSTER_SUPERVISOR];
