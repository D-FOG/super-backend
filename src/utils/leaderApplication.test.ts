import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLeaderApplicationPayload } from "./leaderApplication";

test("normalizes a legacy leader form payload", () => {
  const normalized = normalizeLeaderApplicationPayload({
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "08012345678",
    occupation: "Developer",
    ministryBackground: "Church ministry",
    experience: "3 years",
    location: "Lagos",
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    skills: "Mentoring",
    calling: "Training",
    commitment: "I want to lead"
  });

  assert.equal(normalized.personalInfo.fullName, "Ada Lovelace");
  assert.equal(normalized.personalInfo.email, "ada@example.com");
  assert.match(normalized.background, /Developer/);
  assert.deepEqual(normalized.skills, ["Mentoring"]);
  assert.deepEqual(normalized.location, {
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    raw: "Lagos"
  });
});

test("preserves an already-structured payload", () => {
  const normalized = normalizeLeaderApplicationPayload({
    personalInfo: { fullName: "Grace Hopper", email: "grace@example.com" },
    background: "Engineering",
    location: { city: "Abuja", country: "Nigeria" },
    skills: ["Teaching"],
    callingInterests: "Mobilization"
  });

  assert.equal(normalized.personalInfo.fullName, "Grace Hopper");
  assert.equal(normalized.background, "Engineering");
  assert.deepEqual(normalized.skills, ["Teaching"]);
  assert.equal(normalized.callingInterests, "Mobilization");
});
