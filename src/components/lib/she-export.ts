// ============================================================
// SHE Report Export Utilities — CSV, Excel, PDF, JSON
// ============================================================

import type { SHEReport } from "./she-api-types";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ── Flatten a report into rows for tabular formats ──

interface FlatRow {
  section: string;
  item: string;
  severity: string;
  details: string;
  recommendation: string;
}

function flattenReport(report: SHEReport): FlatRow[] {
  const rows: FlatRow[] = [];

  // PPE missing
  report.ppe_compliance.missing_ppe.forEach((ppe) => {
    rows.push({
      section: "PPE Violation",
      item: ppe,
      severity: "high",
      details: "Required PPE not detected on worker(s)",
      recommendation: "Provide and enforce use of " + ppe,
    });
  });

  // PPE hazards
  report.ppe_compliance.ppe_hazards.forEach((h) => {
    rows.push({
      section: "PPE Hazard",
      item: h.hazard,
      severity: h.severity,
      details: "Missing: " + h.missing_ppe,
      recommendation: "",
    });
  });

  // Environmental hazards
  report.environmental_hazards.forEach((h) => {
    rows.push({
      section: "Environmental Hazard",
      item: h.hazard_type,
      severity: h.severity,
      details: h.description + " | Location: " + h.location_in_scene,
      recommendation: h.recommendation,
    });
  });

  // Unsafe behaviors
  report.unsafe_behaviors.forEach((b) => {
    rows.push({
      section: "Unsafe Behavior",
      item: b.behavior,
      severity: b.severity,
      details:
        b.description +
        " | Affected: " +
        b.affected_workers +
        " | Consequence: " +
        b.potential_consequence,
      recommendation: b.recommendation,
    });
  });

  // Corrective actions
  report.corrective_actions.forEach((a) => {
    rows.push({
      section: "Corrective Action",
      item: a.category,
      severity: a.priority,
      details: a.action,
      recommendation: "",
    });
  });

  return rows;
}

// ── CSV ──

export function downloadCSV(report: SHEReport, filename?: string) {
  const rows = flattenReport(report);
  const headers = ["Section", "Item", "Severity", "Details", "Recommendation"];

  const meta: string[][] = [
    ["Company", report.report_header.company],
    ["Department", report.report_header.analyzed_department],
    ["Date", report.report_header.report_date],
    ["Time", report.report_header.report_time],
    ["Overall Risk", report.summary.overall_risk_level],
    ["Workers Detected", String(report.summary.worker_count)],
    ["Total Findings", String(report.summary.total_findings)],
    ["Scene Description", report.summary.scene_description],
  ];

  // Add AI Summary metadata
  if (report.ai_summary) {
    meta.push(
      ["", ""],
      ["Incident Title", report.ai_summary.incident_title],
      ["Incident Type", report.ai_summary.incident_type],
      ["Severity Assessment", report.ai_summary.severity_assessment],
      ["Narrative Summary", report.ai_summary.narrative_summary],
      ["Immediate Concerns", report.ai_summary.immediate_concerns.join("; ")],
    );
  }

  // Add incident details
  if (report.incident_details) {
    meta.push(
      ["", ""],
      ["Incident Location", report.incident_details.location],
      ["Incident Date", report.incident_details.incident_date],
      ["Incident Time", report.incident_details.incident_time],
      ["Incident Description", report.incident_details.description],
    );
  }

  // Add assessment metadata
  if (report.assessment) {
    meta.push(
      ["", ""],
      ["Assessor", report.assessment.assessor_name],
      ["Risk Confirmed", report.assessment.risk_confirmed],
      ["Assessment Notes", report.assessment.assessment_notes],
      ["Priority Findings", report.assessment.priority_findings.join("; ")],
      ["Recommended Timeline", report.assessment.recommended_timeline],
    );
  }

  // Add workflow status
  if (report.workflow) {
    meta.push(
      ["", ""],
      ["Workflow Status", report.workflow.status],
      ["Assigned Department", report.workflow.assigned_department],
    );
  }

  meta.push(["", ""]);

  const csvRows = [
    ...meta.map((r) =>
      r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(","),
    ),
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((r) =>
      [r.section, r.item, r.severity, r.details, r.recommendation]
        .map((f) => `"${String(f).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(
    blob,
    filename || `SHE_report_${report.report_header.report_date}.csv`,
  );
}

// ── Excel (xlsx) ──

export async function downloadExcel(report: SHEReport, filename?: string) {
  const XLSX = await import("xlsx");
  const rows = flattenReport(report);

  // Summary sheet
  const summaryData: (string | number)[][] = [
    ["EEI SHE Incident Report"],
    [""],
    ["Company", report.report_header.company],
    ["Department", report.report_header.analyzed_department],
    ["Report Date", report.report_header.report_date],
    ["Report Time", report.report_header.report_time],
    ["Overall Risk Level", report.summary.overall_risk_level.toUpperCase()],
    ["Workers Detected", report.summary.worker_count],
    ["Total Findings", report.summary.total_findings],
    ["PPE Violations", report.summary.ppe_violations],
    ["Environmental Hazards", report.summary.environmental_hazards],
    ["Unsafe Behaviors", report.summary.unsafe_behaviors],
    [""],
    ["Scene Description"],
    [report.summary.scene_description],
  ];

  // Findings sheet
  const findingsData = [
    ["Section", "Item", "Severity", "Details", "Recommendation"],
    ...rows.map((r) => [
      r.section,
      r.item,
      r.severity,
      r.details,
      r.recommendation,
    ]),
  ];

  // PPE Status sheet
  const ppeData = [
    ["PPE Item", "Status"],
    ...Object.entries(report.ppe_compliance.ppe_status).map(([key, val]) => [
      key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      val === 1 ? "Detected" : "Missing",
    ]),
  ];

  // AI Summary sheet
  const aiSummaryData: (string | number)[][] = [["AI Summary"]];
  if (report.ai_summary) {
    aiSummaryData.push(
      ["Incident Title", report.ai_summary.incident_title],
      ["Incident Type", report.ai_summary.incident_type],
      ["Severity Assessment", report.ai_summary.severity_assessment],
      ["Narrative Summary", report.ai_summary.narrative_summary],
      ["Immediate Concerns", report.ai_summary.immediate_concerns.join("; ")],
    );
  }
  if (report.incident_details) {
    aiSummaryData.push(
      [""],
      ["Incident Details"],
      ["Description", report.incident_details.description],
      ["Location", report.incident_details.location],
      ["Date", report.incident_details.incident_date],
      ["Time", report.incident_details.incident_time],
    );
  }
  if (report.ai_classification) {
    aiSummaryData.push(
      [""],
      ["AI Classification"],
      ["Department", report.ai_classification.department],
      [
        "Confidence",
        Math.round(report.ai_classification.confidence * 100) + "%",
      ],
      ["Reasoning", report.ai_classification.reasoning],
      [
        "User Override",
        report.ai_classification.overridden_by_user ? "Yes" : "No",
      ],
    );
  }

  // Assessment sheet
  const assessmentData: (string | number)[][] = [["Safety Assessment"]];
  if (report.assessment) {
    assessmentData.push(
      ["Assessor", report.assessment.assessor_name],
      ["Generated By", report.assessment.generated_by],
      ["Risk Confirmed", report.assessment.risk_confirmed],
      [
        "Requires Mitigation",
        report.assessment.requires_mitigation ? "Yes" : "No",
      ],
      ["Assessment Notes", report.assessment.assessment_notes],
      ["Priority Findings", report.assessment.priority_findings.join("; ")],
      ["Recommended Timeline", report.assessment.recommended_timeline],
      ["Additional Actions", report.assessment.additional_actions.join("; ")],
      ["Assessed At", report.assessment.assessed_at],
    );
  }

  // Mitigation sheet
  const mitigationData: (string | number)[][] = [["Mitigation Plan"]];
  if (report.mitigation) {
    mitigationData.push(
      ["Responder", report.mitigation.responder_name],
      ["Department", report.mitigation.department_label],
      ["Notes", report.mitigation.mitigation_notes],
      ["Submitted At", report.mitigation.submitted_at],
      [""],
      ["Mitigation Actions"],
      ["Action", "Hazard Addressed", "Priority", "Status", "Est. Completion"],
      ...report.mitigation.mitigation_actions.map((ma) => [
        ma.action,
        ma.hazard_addressed,
        ma.priority,
        ma.status,
        ma.estimated_completion,
      ]),
      [""],
      ["Preventive Measures"],
      ...report.mitigation.preventive_measures.map((pm) => [pm]),
      [""],
      ["Training Required"],
      ...report.mitigation.training_required.map((tr) => [tr]),
    );
  }

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  const ws2 = XLSX.utils.aoa_to_sheet(findingsData);
  const ws3 = XLSX.utils.aoa_to_sheet(ppeData);
  const ws4 = XLSX.utils.aoa_to_sheet(aiSummaryData);
  const ws5 = XLSX.utils.aoa_to_sheet(assessmentData);
  const ws6 = XLSX.utils.aoa_to_sheet(mitigationData);

  // Set column widths
  ws1["!cols"] = [{ wch: 25 }, { wch: 60 }];
  ws2["!cols"] = [
    { wch: 20 },
    { wch: 30 },
    { wch: 10 },
    { wch: 60 },
    { wch: 40 },
  ];
  ws3["!cols"] = [{ wch: 20 }, { wch: 15 }];
  ws4["!cols"] = [{ wch: 25 }, { wch: 60 }];
  ws5["!cols"] = [{ wch: 25 }, { wch: 60 }];
  ws6["!cols"] = [
    { wch: 30 },
    { wch: 30 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws1, "Summary");
  XLSX.utils.book_append_sheet(wb, ws2, "Findings");
  XLSX.utils.book_append_sheet(wb, ws3, "PPE Status");
  XLSX.utils.book_append_sheet(wb, ws4, "AI Summary");
  XLSX.utils.book_append_sheet(wb, ws5, "Assessment");
  XLSX.utils.book_append_sheet(wb, ws6, "Mitigation");

  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(
    blob,
    filename || `SHE_report_${report.report_header.report_date}.xlsx`,
  );
}

// ── PDF (jsPDF + autoTable) ──

// ── PDF helpers ──
const NAVY: [number, number, number] = [0, 40, 85];
const NAVY_LIGHT: [number, number, number] = [0, 60, 120];
const DIVIDER: [number, number, number] = [210, 215, 225];
const TEXT_PRIMARY: [number, number, number] = [20, 20, 20];
const TEXT_SECONDARY: [number, number, number] = [90, 95, 105];
const WHITE: [number, number, number] = [255, 255, 255];
const ROW_ALT: [number, number, number] = [245, 247, 250];

const RISK_COLORS_PDF: Record<string, [number, number, number]> = {
  critical: [185, 28, 28],
  high: [194, 65, 12],
  medium: [161, 98, 7],
  low: [29, 78, 216],
  safe: [21, 128, 61],
};

function addSectionHeader(
  doc: jsPDF,
  title: string,
  y: number,
  pageWidth: number,
): number {
  doc.setFillColor(...NAVY);
  doc.rect(14, y, pageWidth - 28, 7, "F");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), 17, y + 5);
  doc.setFont("helvetica", "normal");
  return y + 11;
}

function addPageIfNeeded(doc: jsPDF, y: number, needed = 40): number {
  if (y + needed > doc.internal.pageSize.height - 20) {
    doc.addPage();
    return 20;
  }
  return y;
}

function addFooters(doc: jsPDF, reportDate: string) {
  const pageCount = doc.getNumberOfPages();
  const pw = doc.internal.pageSize.width;
  const ph = doc.internal.pageSize.height;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...DIVIDER);
    doc.line(14, ph - 14, pw - 14, ph - 14);
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_SECONDARY);
    doc.setFont("helvetica", "normal");
    doc.text("EEI Corporation — Safety, Health & Environment Department", 14, ph - 8);
    doc.text(
      `${reportDate}  |  Page ${i} of ${pageCount}`,
      pw - 14,
      ph - 8,
      { align: "right" },
    );
  }
}

export function downloadPDF(report: SHEReport, filename?: string) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.width;
  const rows = flattenReport(report);
  const riskLevel = report.summary.overall_risk_level || "medium";
  const rc = RISK_COLORS_PDF[riskLevel] || RISK_COLORS_PDF.medium;

  // ── PAGE 1: COVER HEADER ─────────────────────────────────────────────
  // Top navy banner
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pw, 38, "F");

  doc.setFontSize(16);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.text("EEI CORPORATION", 14, 14);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Safety, Health & Environment Incident Report", 14, 22);

  doc.setFontSize(8.5);
  doc.setTextColor(180, 200, 230);
  doc.text(
    `${report.report_header.analyzed_department}  ·  ${report.report_header.report_date}  ·  ${report.report_header.report_time}`,
    14,
    30,
  );

  // Report ID top-right
  doc.setFontSize(7.5);
  doc.setTextColor(180, 200, 230);
  // Risk level badge (top-right of banner)
  doc.setFillColor(...rc);
  doc.roundedRect(pw - 62, 19, 48, 13, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.text(`${riskLevel.toUpperCase()} RISK`, pw - 38, 27.5, { align: "center" });
  doc.setFont("helvetica", "normal");

  let y = 48;

  // ── SECTION 1: REPORT SUMMARY ───────────────────────────────────────
  y = addSectionHeader(doc, "Report Summary", y, pw);

  // 2-column stats row
  const stats = [
    ["Workers Detected", String(report.summary.worker_count)],
    ["Total Findings", String(report.summary.total_findings)],
    ["PPE Violations", String(report.summary.ppe_violations)],
    ["Environmental Hazards", String(report.summary.environmental_hazards)],
    ["Unsafe Behaviors", String(report.summary.unsafe_behaviors)],
    ["Overall Risk", riskLevel.toUpperCase()],
  ];

  const colW = (pw - 28) / 2;
  stats.forEach((stat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 14 + col * colW;
    const cy = y + row * 10;
    const bg = row % 2 === 0 ? WHITE : ROW_ALT;
    doc.setFillColor(...bg);
    doc.rect(cx, cy - 3.5, colW, 9, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT_PRIMARY);
    doc.text(stat[0], cx + 3, cy + 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(i === 10 ? rc[0] : TEXT_PRIMARY[0], i === 10 ? rc[1] : TEXT_PRIMARY[1], i === 10 ? rc[2] : TEXT_PRIMARY[2]);
    doc.text(stat[1], cx + colW - 3, cy + 2, { align: "right" });
  });

  y += Math.ceil(stats.length / 2) * 10 + 6;

  // Scene description
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...TEXT_SECONDARY);
  const sceneLines = doc.splitTextToSize(report.summary.scene_description, pw - 28);
  doc.text(sceneLines, 14, y);
  y += sceneLines.length * 4.5 + 8;

  // ── SECTION 2: INCIDENT DETAILS ─────────────────────────────────────
  if (report.incident_details) {
    y = addPageIfNeeded(doc, y, 45);
    y = addSectionHeader(doc, "Incident Details", y, pw);

    autoTable(doc, {
      startY: y,
      theme: "plain",
      styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
      body: [
        ["Location", report.incident_details.location || "—"],
        ["Date & Time", `${report.incident_details.incident_date || "—"}  ${report.incident_details.incident_time || ""}`.trim()],
        ["Description", report.incident_details.description || "—"],
      ],
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 38, textColor: TEXT_PRIMARY, fillColor: ROW_ALT },
        1: { cellWidth: pw - 28 - 38, textColor: TEXT_PRIMARY },
      },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.row.index % 2 === 0 && data.column.index === 1) {
          data.cell.styles.fillColor = WHITE;
        }
        if (data.section === "body" && data.row.index % 2 !== 0 && data.column.index === 1) {
          data.cell.styles.fillColor = ROW_ALT;
        }
      },
    });
    y = ((doc as any).lastAutoTable?.finalY || y) + 8;
  }

  // ── SECTION 3: AI INCIDENT SUMMARY ──────────────────────────────────
  if (report.ai_summary) {
    y = addPageIfNeeded(doc, y, 50);
    y = addSectionHeader(doc, "AI Incident Summary", y, pw);

    autoTable(doc, {
      startY: y,
      theme: "plain",
      styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
      body: [
        ["Incident Title", report.ai_summary.incident_title || "—"],
        ["Incident Type", report.ai_summary.incident_type?.replace(/_/g, " ") || "—"],
        ["Severity Assessment", report.ai_summary.severity_assessment || "—"],
        ["Immediate Concerns", report.ai_summary.immediate_concerns?.join(" · ") || "—"],
      ],
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 38, fillColor: ROW_ALT, textColor: TEXT_PRIMARY },
        1: { cellWidth: pw - 28 - 38, textColor: TEXT_PRIMARY },
      },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 1) {
          data.cell.styles.fillColor = data.row.index % 2 === 0 ? WHITE : ROW_ALT;
        }
      },
    });
    y = ((doc as any).lastAutoTable?.finalY || y) + 4;

    if (report.ai_summary.narrative_summary) {
      doc.setFillColor(...ROW_ALT);
      const narrativeLines = doc.splitTextToSize(report.ai_summary.narrative_summary, pw - 34);
      const boxH = narrativeLines.length * 4.5 + 8;
      doc.rect(14, y, pw - 28, boxH, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...TEXT_SECONDARY);
      doc.text(narrativeLines, 17, y + 5);
      doc.setFont("helvetica", "normal");
      y += boxH + 8;
    }
  }

  // ── SECTION 4: DETAILED FINDINGS ────────────────────────────────────
  if (rows.length > 0) {
    doc.addPage();
    y = 20;
    y = addSectionHeader(doc, "Detailed Findings", y, pw);

    const severityFill: Record<string, [number, number, number]> = {
      critical: [254, 226, 226],
      high: [255, 237, 213],
      medium: [254, 249, 195],
      low: [219, 234, 254],
      safe: [220, 252, 231],
    };
    const severityText: Record<string, [number, number, number]> = {
      critical: [153, 27, 27],
      high: [154, 52, 18],
      medium: [133, 77, 14],
      low: [29, 78, 216],
      safe: [21, 128, 61],
    };

    autoTable(doc, {
      startY: y,
      head: [["Section", "Item", "Sev.", "Details", "Recommendation"]],
      body: rows.map((r) => [r.section, r.item, r.severity, r.details, r.recommendation]),
      headStyles: {
        fillColor: NAVY,
        textColor: WHITE,
        fontSize: 8,
        fontStyle: "bold",
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      },
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        textColor: TEXT_PRIMARY,
        lineColor: DIVIDER,
        lineWidth: 0.1,
      },
      alternateRowStyles: { fillColor: ROW_ALT },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: "bold" },
        1: { cellWidth: 30 },
        2: { cellWidth: 14, halign: "center" },
        3: { cellWidth: 68 },
        4: { cellWidth: 38 },
      },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 2) {
          const sev = String(data.cell.raw).toLowerCase();
          if (severityFill[sev]) {
            data.cell.styles.fillColor = severityFill[sev];
            data.cell.styles.textColor = severityText[sev] || TEXT_PRIMARY;
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    y = ((doc as any).lastAutoTable?.finalY || y) + 8;
  }

  // ── SECTION 5: SAFETY ASSESSMENT ────────────────────────────────────
  if (report.assessment) {
    y = addPageIfNeeded(doc, y, 55);
    y = addSectionHeader(doc, "Safety Assessment", y, pw);

    autoTable(doc, {
      startY: y,
      theme: "plain",
      styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
      body: [
        ["Assessor", report.assessment.assessor_name || "—"],
        ["Risk Confirmed", report.assessment.risk_confirmed || "—"],
        ["Priority Findings", report.assessment.priority_findings?.join(" · ") || "—"],
        ["Recommended Timeline", report.assessment.recommended_timeline?.replace(/_/g, " ") || "—"],
        ...(report.assessment.additional_actions?.length
          ? [["Additional Actions", report.assessment.additional_actions.join(" · ")]]
          : []),
      ],
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 38, fillColor: ROW_ALT, textColor: TEXT_PRIMARY },
        1: { cellWidth: pw - 28 - 38, textColor: TEXT_PRIMARY },
      },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 1) {
          data.cell.styles.fillColor = data.row.index % 2 === 0 ? WHITE : ROW_ALT;
        }
      },
    });
    y = ((doc as any).lastAutoTable?.finalY || y) + 4;

    if (report.assessment.assessment_notes) {
      y = addPageIfNeeded(doc, y, 20);
      const noteLines = doc.splitTextToSize(report.assessment.assessment_notes, pw - 34);
      const boxH = noteLines.length * 4.5 + 8;
      doc.setFillColor(...ROW_ALT);
      doc.rect(14, y, pw - 28, boxH, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...TEXT_SECONDARY);
      doc.text(noteLines, 17, y + 5);
      doc.setFont("helvetica", "normal");
      y += boxH + 8;
    }
  }

  // ── SECTION 6: MITIGATION PLAN ───────────────────────────────────────
  if (report.mitigation && report.mitigation.mitigation_actions.length > 0) {
    y = addPageIfNeeded(doc, y, 55);
    y = addSectionHeader(doc, "Mitigation Plan", y, pw);

    // Submitter info line
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_SECONDARY);
    doc.text(
      `Submitted by ${report.mitigation.responder_name || "—"} (${report.mitigation.department_label || "—"})` +
      (report.mitigation.submitted_at ? `  ·  ${new Date(report.mitigation.submitted_at).toLocaleDateString()}` : ""),
      14, y,
    );
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Action", "Hazard Addressed", "Priority", "Timeline", "Status"]],
      body: report.mitigation.mitigation_actions.map((ma) => [
        ma.action,
        ma.hazard_addressed,
        ma.priority,
        ma.estimated_completion?.replace(/_/g, " ") || "—",
        ma.status,
      ]),
      headStyles: {
        fillColor: NAVY,
        textColor: WHITE,
        fontSize: 8,
        fontStyle: "bold",
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      },
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        lineColor: DIVIDER,
        lineWidth: 0.1,
      },
      alternateRowStyles: { fillColor: ROW_ALT },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 50 },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 30 },
        4: { cellWidth: 20, halign: "center" },
      },
    });
    y = ((doc as any).lastAutoTable?.finalY || y) + 8;

    // Preventive measures
    if (report.mitigation.preventive_measures?.length > 0) {
      y = addPageIfNeeded(doc, y, 30);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...NAVY_LIGHT);
      doc.text("Preventive Measures", 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT_PRIMARY);
      report.mitigation.preventive_measures.forEach((pm) => {
        const lines = doc.splitTextToSize(`•  ${pm}`, pw - 30);
        doc.setFontSize(8);
        doc.text(lines, 17, y);
        y += lines.length * 4.5 + 1;
      });
      y += 4;
    }

    // Mitigation notes
    if (report.mitigation.mitigation_notes) {
      y = addPageIfNeeded(doc, y, 20);
      const noteLines = doc.splitTextToSize(report.mitigation.mitigation_notes, pw - 34);
      const boxH = noteLines.length * 4.5 + 8;
      doc.setFillColor(...ROW_ALT);
      doc.rect(14, y, pw - 28, boxH, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...TEXT_SECONDARY);
      doc.text(noteLines, 17, y + 5);
      doc.setFont("helvetica", "normal");
      y += boxH + 6;
    }
  }

  // ── FOOTERS ──────────────────────────────────────────────────────────
  addFooters(doc, report.report_header.report_date);

  const pdfBlob = doc.output("blob");
  triggerDownload(
    pdfBlob,
    filename || `SHE_report_${report.report_header.report_date}.pdf`,
  );
}

// ── JSON ──

export function downloadJSON(report: SHEReport, filename?: string) {
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  triggerDownload(
    blob,
    filename || `SHE_report_${report.report_header.report_date}.json`,
  );
}

// ── Helper ──

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}