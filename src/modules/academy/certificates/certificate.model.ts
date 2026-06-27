import { model, Schema, type InferSchemaType } from "mongoose";

const certificateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    level: { type: String, required: true, trim: true },
    issuedAt: { type: Date, required: true },
    certificateUrl: { type: String, trim: true },
    revokedAt: { type: Date }
  },
  { timestamps: true }
);

export type CertificateDocument = InferSchemaType<typeof certificateSchema>;
export const Certificate = model<CertificateDocument>("Certificate", certificateSchema);
