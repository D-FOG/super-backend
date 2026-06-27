import bcrypt from "bcrypt";
import { model, Schema, type InferSchemaType } from "mongoose";
import { DEFAULT_ROLE, ROLE_VALUES } from "../../constants/roles";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    profession: { type: String, trim: true },
    location: { type: String, trim: true },
    roles: { type: [String], enum: ROLE_VALUES, default: [DEFAULT_ROLE] },
    clusterCenterId: { type: Schema.Types.ObjectId, ref: "ClusterCenter" },
    trainingLevel: { type: String, trim: true },
    certificationLevel: { type: String, trim: true },
    skills: { type: [String], default: [] },
    availability: { type: String, trim: true },
    category: { type: String, trim: true },
    refreshTokenHash: { type: String, select: false }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export type UserDocument = InferSchemaType<typeof userSchema> & {
  comparePassword(candidate: string): Promise<boolean>;
};

export const User = model<UserDocument>("User", userSchema);
