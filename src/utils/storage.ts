// Types for MongoDB Collections

export interface User {
  _id?: string;
  username: string;
  email: string;
  password: string;
  fullName: string;
  department?: string | null;
  role: string;
  createdAt?: Date | null;
}

export interface Incident {
  _id?: string;
  incidentId?: string;
  reportedBy: string;
  department?: string | null;
  hazardType?: string | null;
  riskLevel?: string | null;
  status?: string | null;
  imageUrl?: string | null;
  aiAnalysis?: string | null;
  aiGeneratedReport?: string | null;
  location?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface Report {
  _id?: string;
  incidentId?: string;
  createdAt?: Date | null;
  reportType?: string | null;
  content?: string | null;
  generatedBy?: string | null;
  exportUrl?: string | null;
}

export interface ComplianceRecord {
  _id?: string;
  department?: string | null;
  regulationType?: string | null;
  complianceScore?: string | null;
  lastAssessment?: Date | null;
  status?: string | null;
}

export interface AnalyticsData {
  _id?: string;
  metric?: string | null;
  value?: string | null;
  period?: string | null;
  date?: Date | null;
  department?: string | null;
}

export interface Module {
  _id?: string;
  name: string;
  department?: string | null;
  createdAt?: Date | null;
  isActive?: boolean;
}

// Storage Interface

export interface IStorage {
  getUser(_id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Omit<User, "_id">): Promise<User>;

  getIncidents(): Promise<Incident[]>;
  getIncident(_id: string): Promise<Incident | undefined>;
  createIncident(incident: Omit<Incident, "_id">): Promise<Incident>;
  updateIncident(_id: string, updates: Partial<Incident>): Promise<Incident | undefined>;
  getIncidentsByDepartment(department: string): Promise<Incident[]>;

  getReports(): Promise<Report[]>;
  createReport(report: Omit<Report, "_id">): Promise<Report>;
  getReportsByIncident(incidentId: string): Promise<Report[]>;

  getComplianceRecords(): Promise<ComplianceRecord[]>;
  getComplianceByDepartment(department: string): Promise<ComplianceRecord[]>;
  createComplianceRecord(record: Omit<ComplianceRecord, "_id">): Promise<ComplianceRecord>;
  updateComplianceRecord(_id: string, updates: Partial<ComplianceRecord>): Promise<ComplianceRecord | undefined>;

  getAnalyticsData(): Promise<AnalyticsData[]>;
  getAnalyticsByMetric(metric: string): Promise<AnalyticsData[]>;
  createAnalyticsData(data: Omit<AnalyticsData, "_id">): Promise<AnalyticsData>;

  getModules(): Promise<Module[]>;
  getModulesByDepartment(department: string): Promise<Module[]>;
  createModule(module: Omit<Module, "_id">): Promise<Module>;
  updateModule(_id: string, updates: Partial<Module>): Promise<Module | undefined>;
  deleteModule(_id: string): Promise<boolean>;
}

// In-Memory MongoDB-like Storage

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private incidents: Map<string, Incident>;
  private reports: Map<string, Report>;
  private complianceRecords: Map<string, ComplianceRecord>;
  private analyticsData: Map<string, AnalyticsData>;
  private modules: Map<string, Module>;

  constructor() {
    this.users = new Map();
    this.incidents = new Map();
    this.reports = new Map();
    this.complianceRecords = new Map();
    this.analyticsData = new Map();
    this.modules = new Map();

    this.initializeData();
  }

  private generateId() {
    return Math.random().toString(36).substr(2, 12);
  }

  private initializeData() {
    const userId = this.generateId();
    const sampleUser: User = {
      _id: userId,
      username: "safety_officer",
      email: "safety@worksafer.com",
      password: "password123",
      fullName: "John Safety Officer",
      department: "Safety Department",
      role: "safety_officer",
      createdAt: new Date()
    };
    this.users.set(userId, sampleUser);

    const incidentId1 = this.generateId();
    this.incidents.set(incidentId1, {
      _id: incidentId1,
      incidentId: "INC-2024-001",
      reportedBy: userId,
      department: "Safety Department",
      hazardType: "Energized Line",
      riskLevel: "High",
      status: "pending",
      imageUrl: null,
      aiAnalysis: "Energized line hazard detected",
      aiGeneratedReport: "High risk, isolation required.",
      location: "Site A - Building 1",
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15")
    });

    const complianceId1 = this.generateId();
    this.complianceRecords.set(complianceId1, {
      _id: complianceId1,
      department: "Safety Department",
      regulationType: "OSHA Electrical Safety Standards",
      complianceScore: "89.00",
      lastAssessment: new Date("2024-05-15"),
      status: "needs_attention"
    });

    const analyticId1 = this.generateId();
    this.analyticsData.set(analyticId1, {
      _id: analyticId1,
      metric: "total_incidents",
      value: "24.00",
      period: "monthly",
      date: new Date(),
      department: null
    });

    const moduleId1 = this.generateId();
    this.modules.set(moduleId1, {
      _id: moduleId1,
      name: "Incident Reporting",
      department: "Safety Department",
      createdAt: new Date(),
      isActive: true
    });
  }

  async getUser(_id: string): Promise<User | undefined> {
    return this.users.get(_id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(user: Omit<User, "_id">): Promise<User> {
    const _id = this.generateId();
    const newUser: User = { ...user, _id, createdAt: new Date() };
    this.users.set(_id, newUser);
    return newUser;
  }

  async getIncidents(): Promise<Incident[]> {
    return Array.from(this.incidents.values());
  }

  async getIncident(_id: string): Promise<Incident | undefined> {
    return this.incidents.get(_id);
  }

  async createIncident(incident: Omit<Incident, "_id">): Promise<Incident> {
    const _id = this.generateId();
    const newIncident: Incident = { ...incident, _id, createdAt: new Date(), updatedAt: new Date() };
    this.incidents.set(_id, newIncident);
    return newIncident;
  }

  async updateIncident(_id: string, updates: Partial<Incident>): Promise<Incident | undefined> {
    const incident = this.incidents.get(_id);
    if (!incident) return undefined;
    const updatedIncident = { ...incident, ...updates, updatedAt: new Date() };
    this.incidents.set(_id, updatedIncident);
    return updatedIncident;
  }

  async getIncidentsByDepartment(department: string): Promise<Incident[]> {
    return Array.from(this.incidents.values()).filter(i =>
      i.department === department
    );
  }

  async getReports(): Promise<Report[]> {
    return Array.from(this.reports.values());
  }

  async createReport(report: Omit<Report, "_id">): Promise<Report> {
    const _id = this.generateId();
    const newReport: Report = { ...report, _id, createdAt: new Date() };
    this.reports.set(_id, newReport);
    return newReport;
  }

  async getReportsByIncident(incidentId: string): Promise<Report[]> {
    return Array.from(this.reports.values()).filter(r => r.incidentId === incidentId);
  }

  async getComplianceRecords(): Promise<ComplianceRecord[]> {
    return Array.from(this.complianceRecords.values());
  }

  async getComplianceByDepartment(department: string): Promise<ComplianceRecord[]> {
    return Array.from(this.complianceRecords.values()).filter(r => r.department === department);
  }

  async createComplianceRecord(record: Omit<ComplianceRecord, "_id">): Promise<ComplianceRecord> {
    const _id = this.generateId();
    const newRecord: ComplianceRecord = { ...record, _id, lastAssessment: new Date() };
    this.complianceRecords.set(_id, newRecord);
    return newRecord;
  }

  async updateComplianceRecord(_id: string, updates: Partial<ComplianceRecord>): Promise<ComplianceRecord | undefined> {
    const record = this.complianceRecords.get(_id);
    if (!record) return undefined;
    const updatedRecord = { ...record, ...updates };
    this.complianceRecords.set(_id, updatedRecord);
    return updatedRecord;
  }

  async getAnalyticsData(): Promise<AnalyticsData[]> {
    return Array.from(this.analyticsData.values());
  }

  async getAnalyticsByMetric(metric: string): Promise<AnalyticsData[]> {
    return Array.from(this.analyticsData.values()).filter(d => d.metric === metric);
  }

  async createAnalyticsData(data: Omit<AnalyticsData, "_id">): Promise<AnalyticsData> {
    const _id = this.generateId();
    const newData: AnalyticsData = { ...data, _id, date: new Date() };
    this.analyticsData.set(_id, newData);
    return newData;
  }

  async getModules(): Promise<Module[]> {
    return Array.from(this.modules.values());
  }

  async getModulesByDepartment(department: string): Promise<Module[]> {
    return Array.from(this.modules.values()).filter(m => m.department === department && m.isActive);
  }

  async createModule(module: Omit<Module, "_id">): Promise<Module> {
    const _id = this.generateId();
    const newModule: Module = { ...module, _id, createdAt: new Date() };
    this.modules.set(_id, newModule);
    return newModule;
  }

  async updateModule(_id: string, updates: Partial<Module>): Promise<Module | undefined> {
    const module = this.modules.get(_id);
    if (!module) return undefined;
    const updatedModule = { ...module, ...updates };
    this.modules.set(_id, updatedModule);
    return updatedModule;
  }

  async deleteModule(_id: string): Promise<boolean> {
    return this.modules.delete(_id);
  }
}

export const storage = new MemStorage();