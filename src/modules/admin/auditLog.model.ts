import { model, Schema } from "mongoose";

const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    entity: { type: String },
    entityId: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export const AuditLog = model("AuditLog", auditLogSchema);
