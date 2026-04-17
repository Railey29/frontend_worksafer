/*
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "utils/storage";
import {
  insertIncidentSchema,
  insertReportSchema,
  insertUserSchema,
  insertComplianceSchema,
  insertAnalyticsSchema,
} from "shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";

// Always only expose these fields for user responses.
function toUserResponse(user: any) {
  return {
    id: user.id,
    username: user.username,
    department: user.department,
    role: user.role
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        res.status(409).json({ error: "Username already exists" });
        return;
      }
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      const userDataWithHashedPassword = { ...validatedData, password: hashedPassword };
      const user = await storage.createUser(userDataWithHashedPassword);
      res.status(201).json(toUserResponse(user));
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create user" });
      }
    }
  });

  app.post("/api/users/login", async (req, res) => {
    try {
      const { username, password }: { username: string; password: string } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      res.json(toUserResponse(user));
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/incidents", async (req, res) => {
    try {
      const incidents = await storage.getIncidents();
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });

  app.post("/api/incidents", async (req, res) => {
    try {
      // reportedBy must be a number
      if (typeof req.body.reportedBy !== "number" || isNaN(req.body.reportedBy)) {
        res.status(400).json({ error: "reportedBy must be a number" });
        return;
      }
      const validatedData = insertIncidentSchema.parse(req.body);
      const incident = await storage.createIncident(validatedData);
      res.status(201).json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create incident" });
      }
    }
  });

  app.get("/api/incidents/:id", async (req, res) => {
    try {
      const id: string = req.params.id;
      const incident = await storage.getIncident(id);
      if (!incident) {
        res.status(404).json({ error: "Incident not found" });
        return;
      }
      res.json(incident);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incident" });
    }
  });

  app.patch("/api/incidents/:id", async (req, res) => {
    try {
      const id: string = req.params.id;
      const incident = await storage.updateIncident(id, req.body);
      if (!incident) {
        res.status(404).json({ error: "Incident not found" });
        return;
      }
      res.json(incident);
    } catch (error) {
      res.status(500).json({ error: "Failed to update incident" });
    }
  });

  app.get("/api/reports", async (req, res) => {
    try {
      const reports = await storage.getReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.get("/api/reports/export/:format", async (req, res) => {
    try {
      const { format } = req.params;
      const incidents = await storage.getIncidents();
      const headers = ['Incident ID', 'Date', 'Department', 'Hazard Type', 'Risk Level', 'Status'];
      const rows = incidents.map((incident) => [
        incident.incidentId,
        incident.createdAt ? incident.createdAt.toISOString().split('T')[0] : '',
        incident.department,
        incident.hazardType,
        incident.riskLevel,
        incident.status
      ]);
      switch (format.toLowerCase()) {
        case 'csv':
          const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="safety_reports.csv"');
          res.send(csvContent);
          break;
        case 'json':
          const jsonData = {
            exportDate: new Date().toISOString(),
            totalRecords: incidents.length,
            data: incidents.map((incident) => ({
              incidentId: incident.incidentId,
              date: incident.createdAt ? incident.createdAt.toISOString().split('T')[0] : '',
              department: incident.department,
              hazardType: incident.hazardType,
              riskLevel: incident.riskLevel,
              status: incident.status,
              location: incident.location,
              aiAnalysis: incident.aiAnalysis
            }))
          };
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', 'attachment; filename="safety_reports.json"');
          res.json(jsonData);
          break;
        case 'xlsx':
          const XLSX = require('xlsx');
          const workbook = XLSX.utils.book_new();
          const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Safety Reports');
          const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename="safety_reports.xlsx"');
          res.send(buffer);
          break;
        case 'pdf':
          const { jsPDF } = require('jspdf');
          require('jspdf-autotable');
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.text('Safety Reports', 14, 20);
          doc.setFontSize(10);
          doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
          doc.autoTable({
            head: [headers],
            body: rows,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] }
          });
          const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="safety_reports.pdf"');
          res.send(pdfBuffer);
          break;
        default:
          res.status(400).json({ error: "Unsupported format. Use csv, json, xlsx, or pdf" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to export reports" });
    }
  });

  app.get("/api/compliance", async (req, res) => {
    try {
      const records = await storage.getComplianceRecords();
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch compliance records" });
    }
  });

  app.get("/api/compliance/export/:format", async (req, res) => {
    try {
      const { format } = req.params;
      const records = await storage.getComplianceRecords();
      const headers = ['Department', 'Regulation Type', 'Compliance Score', 'Status', 'Last Assessment'];
      const rows = records.map((record) => [
        record.department,
        record.regulationType,
        record.complianceScore,
        record.status,
        record.lastAssessment ? record.lastAssessment.toISOString().split('T')[0] : ''
      ]);
      switch (format.toLowerCase()) {
        case 'csv':
          const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="compliance_report.csv"');
          res.send(csvContent);
          break;
        case 'json':
          const jsonData = {
            exportDate: new Date().toISOString(),
            totalRecords: records.length,
            data: records
          };
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', 'attachment; filename="compliance_report.json"');
          res.json(jsonData);
          break;
        case 'xlsx':
          const XLSX = require('xlsx');
          const workbook = XLSX.utils.book_new();
          const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Compliance Records');
          const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename="compliance_report.xlsx"');
          res.send(buffer);
          break;
        case 'pdf':
          const { jsPDF } = require('jspdf');
          require('jspdf-autotable');
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.text('Compliance Report', 14, 20);
          doc.setFontSize(10);
          doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
          doc.autoTable({
            head: [headers],
            body: rows,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] }
          });
          const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="compliance_report.pdf"');
          res.send(pdfBuffer);
          break;
        default:
          res.status(400).json({ error: "Unsupported format. Use csv, json, xlsx, or pdf" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to export compliance data" });
    }
  });

  app.get("/api/analytics", async (req, res) => {
    try {
      const data = await storage.getAnalyticsData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics data" });
    }
  });

  app.get("/api/analytics/export/:format", async (req, res) => {
    try {
      const { format } = req.params;
      const data = await storage.getAnalyticsData();
      const headers = ['Metric', 'Value', 'Period', 'Date', 'Department'];
      const rows = data.map((item) => [
        item.metric,
        item.value,
        item.period,
        item.date ? item.date.toISOString().split('T')[0] : '',
        item.department || 'All Departments'
      ]);
      switch (format.toLowerCase()) {
        case 'csv':
          const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="analytics_data.csv"');
          res.send(csvContent);
          break;
        case 'json':
          const jsonData = {
            exportDate: new Date().toISOString(),
            totalRecords: data.length,
            data: data
          };
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', 'attachment; filename="analytics_data.json"');
          res.json(jsonData);
          break;
        case 'xlsx':
          const XLSX = require('xlsx');
          const workbook = XLSX.utils.book_new();
          const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics Data');
          const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename="analytics_data.xlsx"');
          res.send(buffer);
          break;
        case 'pdf':
          const { jsPDF } = require('jspdf');
          require('jspdf-autotable');
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.text('Analytics Report', 14, 20);
          doc.setFontSize(10);
          doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
          doc.autoTable({
            head: [headers],
            body: rows,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] }
          });
          const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="analytics_report.pdf"');
          res.send(pdfBuffer);
          break;
        default:
          res.status(400).json({ error: "Unsupported format. Use csv, json, xlsx, or pdf" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to export analytics data" });
    }
  });

  // You can add analyze-photo and analyze-incident-photo routes as before...
  // The user/incident create fixes above solve your schema type errors.

  const httpServer = createServer(app);
  return httpServer;
}
*/