type LegacyLeaderPayload = Record<string, unknown> & {
  personalInfo?: Record<string, unknown>;
  background?: string;
  location?: unknown;
  skills?: unknown;
  callingInterests?: string;
  applicantUserId?: string;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeLeaderApplicationPayload(payload: LegacyLeaderPayload) {
  if (payload.personalInfo && typeof payload.personalInfo === "object") {
    const personalInfo = payload.personalInfo as Record<string, unknown>;
    return {
      applicantUserId: payload.applicantUserId,
      personalInfo: {
        ...(typeof personalInfo === "object" ? personalInfo : {}),
        fullName: stringValue(personalInfo.fullName || personalInfo.name),
        email: stringValue(personalInfo.email),
        phone: stringValue(personalInfo.phone || personalInfo.contact)
      },
      background: stringValue(payload.background),
      location: normalizeLocation(payload.location),
      skills: normalizeSkills(payload.skills),
      callingInterests: stringValue(payload.callingInterests)
    };
  }

  const locationValue = normalizeLocation(payload.location);
  const fullName = stringValue(payload.name || payload.fullName);
  const email = stringValue(payload.email);
  const phone = stringValue(payload.phone || payload.contact);
  const occupation = stringValue(payload.occupation);
  const ministryBackground = stringValue(payload.ministryBackground || payload.trainingBackground);
  const experience = stringValue(payload.experience || payload.meetingCapacity);
  const skills = normalizeSkills(payload.skills || payload.skillSet);
  const calling = stringValue(payload.calling || payload.callingInterests);
  const commitment = stringValue(payload.commitment || payload.reason);

  return {
    applicantUserId: payload.applicantUserId,
    personalInfo: {
      fullName,
      email,
      phone,
      occupation,
      ministryBackground,
      experience
    },
    background: [occupation, ministryBackground, experience].filter(Boolean).join(" | "),
    location: locationValue,
    skills,
    callingInterests: [calling, commitment].filter(Boolean).join(" | ")
  };
}

function normalizeLocation(location: unknown) {
  if (location && typeof location === "object") {
    const value = location as Record<string, unknown>;
    return {
      city: stringValue(value.city),
      state: stringValue(value.state),
      country: stringValue(value.country),
      raw: [value.city, value.state, value.country].filter(Boolean).join(", ")
    };
  }

  return {
    city: "",
    state: "",
    country: "",
    raw: stringValue(location)
  };
}

function normalizeSkills(skills: unknown) {
  if (Array.isArray(skills)) return skills.map((skill) => String(skill)).filter(Boolean);
  if (typeof skills === "string") {
    return skills
      .split(/[,;/]/)
      .map((skill) => skill.trim())
      .filter(Boolean);
  }
  return [];
}
