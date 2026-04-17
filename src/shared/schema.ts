import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  department: text("department").notNull(),
  role: text("role").notNull().default("safety_officer"),
});

export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  incidentId: text("incident_id").notNull().unique(),
  reportedBy: integer("reported_by").notNull(),
  department: text("department").notNull(),
  hazardType: text("hazard_type").notNull(),
  riskLevel: text("risk_level").notNull(),
  status: text("status").notNull().default("pending"),
  imageUrl: text("image_url"),
  aiAnalysis: text("ai_analysis"),
  aiGeneratedReport: text("ai_generated_report"),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull(),
  reportType: text("report_type").notNull(),
  generatedBy: text("generated_by").notNull().default("AI"),
  content: text("content").notNull(),
  exportFormat: text("export_format").notNull().default("csv"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const complianceRecords = pgTable("compliance_records", {
  id: serial("id").primaryKey(),
  department: text("department").notNull(),
  regulationType: text("regulation_type").notNull(), // OSHA, ISO45001, Local
  complianceScore: decimal("compliance_score", { precision: 5, scale: 2 }).notNull(),
  lastAssessment: timestamp("last_assessment").defaultNow().notNull(),
  status: text("status").notNull().default("compliant"),
});

export const analyticsData = pgTable("analytics_data", {
  id: serial("id").primaryKey(),
  metric: text("metric").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  period: text("period").notNull(), // daily, weekly, monthly
  date: timestamp("date").defaultNow().notNull(),
  department: text("department"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  incidentId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export const insertComplianceSchema = createInsertSchema(complianceRecords).omit({
  id: true,
  lastAssessment: true,
});

export const insertAnalyticsSchema = createInsertSchema(analyticsData).omit({
  id: true,
  date: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export type ComplianceRecord = typeof complianceRecords.$inferSelect;
export type InsertComplianceRecord = z.infer<typeof insertComplianceSchema>;

export type AnalyticsData = typeof analyticsData.$inferSelect;
export type InsertAnalyticsData = z.infer<typeof insertAnalyticsSchema>;