// Friendly names for the types generated from the backend's OpenAPI schema.
// Regenerate after any backend schema change:  npm run gen:api
import type { components } from "./generated/schema";

type Schemas = components["schemas"];

export type User = Schemas["UserRead"];
export type UserCreate = Schemas["UserCreate"];
export type UserUpdate = Schemas["UserUpdate"];
export type Role = Schemas["Role"];
export type Page<T> = { items: T[]; total: number; offset: number; limit: number };

export type Doctor = Schemas["DoctorRead"];
export type DoctorBrief = Schemas["DoctorBrief"];

export type Patient = Schemas["PatientRead"];
export type PatientBrief = Schemas["PatientBrief"];
export type PatientCreate = Schemas["PatientCreate"];
export type PatientUpdate = Schemas["PatientUpdate"];
export type Gender = Schemas["Gender"];
export type BloodGroup = Schemas["BloodGroup"];

export type Visit = Schemas["VisitRead"];
export type VisitCreate = Schemas["VisitCreate"];
export type VisitPage = Schemas["VisitPage"];
export type Vitals = Schemas["Vitals"];
export type Medicine = Schemas["MedicineCreate"];

export type DashboardSummary = Schemas["DashboardSummary"];
export type FollowUp = Schemas["FollowUp"];
export type Activity = Schemas["ActivityRead"];
export type ActivityType = Schemas["ActivityType"];
