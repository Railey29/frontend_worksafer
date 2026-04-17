# Incident Report Status Workflow Implementation

## Overview

A complete 5-stage incident report workflow system has been implemented with auto-transitions, manual controls, and visual status tracking.

## Workflow Stages

The system implements the following 5-stage workflow:

1. **Submitted** (Initial State)
   - Auto-set when a report is saved to the database
   - Backend should initialize `status = "submitted"` instead of "closed" or "pending_assessment"

2. **Under Review**
   - Manual transition only
   - Triggered by: Safety Dept admin clicks "Start Review" on the reports page
   - Action: PATCH `/api/reports/{id}/status` with `{ status: "under_review" }`

3. **Action Required**
   - Auto-transition: After AI generates mitigation plan
   - Triggered automatically after `ai_mitigation` is saved to DB
   - Backend should fire the status update right after saving mitigation

4. **In Progress**
   - Manual transition only
   - Triggered by: Responsible department acknowledges and starts corrective actions
   - Action: PATCH call with `{ status: "in_progress", notes: "..." }`
   - Permission: Only assigned department can make this transition

5. **Closed**
   - Manual transition only
   - Triggered by: Safety Dept verifies corrective actions are complete
   - Action: PATCH call with optional `{ closed_note: "..." }` for audit trail
   - Permission: Safety Department only

## Components Created

### 1. WorkflowStatusVisualization Component

**File**: `src/components/workflow-status-visualization.tsx`

Provides visual representation of the workflow status with:

- **Horizontal visualization**: Shows numbered circles (1-5) for each stage with connecting lines
- **Compact vertical version**: For sidebar/dashboard views
- **Automatic highlighting**: Current stage is highlighted with scale animation
- **Progressive completion**: Completed stages show filled color, future stages are grayed out

Usage:

```typescript
<WorkflowStatusVisualization
  currentStatus={report.workflow.status}
  size="md" // "sm" | "md" | "lg"
/>
```

### 2. Updated API Types

**File**: `src/components/lib/she-api-types.ts`

Enhanced `WORKFLOW_STATUS_COLORS` to support all 5 stages with labels:

```typescript
{
  submitted: { bg: "bg-blue-100", text: "text-blue-800", label: "Submitted" },
  under_review: { bg: "bg-purple-100", text: "text-purple-800", label: "Under Review" },
  action_required: { bg: "bg-orange-100", text: "text-orange-800", label: "Action Required" },
  in_progress: { bg: "bg-amber-100", text: "text-amber-800", label: "In Progress" },
  closed: { bg: "bg-green-100", text: "text-green-800", label: "Closed" },
}
```

### 3. New API Function

**File**: `src/components/lib/she-api.ts`

Added `updateReportStatus()` function to handle status transitions:

```typescript
export async function updateReportStatus(
  id: string,
  params: {
    status:
      | "submitted"
      | "under_review"
      | "action_required"
      | "in_progress"
      | "closed";
    notes?: string;
    closed_note?: string;
  },
): Promise<SHEReport>;
```

Calls: `PATCH /api/reports/{id}/status`

### 4. Enhanced Report Detail Page

**File**: `src/pages/report-detail.tsx`

Additions:

- **Status Visualization**: Displays the 5-stage workflow with current progress
- **Status Update Dialog**: Allows Safety Dept to change status with optional notes
- **Workflow History**: Shows timeline of all status changes with timestamps and notes
- **Permission Gating**: Only Safety Department can update status
- **Mutation Management**: Handles status updates with loading states and error handling

## Permission Controls

### Status Update Access

- **Safety Department ONLY**: Can transition between any status
- **Other Departments**: Can view status but cannot update it
  - Display message: "Only Safety Department can update report status."

### Department Visibility

- **Safety Department**: Can view reports from all departments
- **Other Departments**: Can only view reports assigned to their department

## Backend Integration Points

The following endpoints are expected on the Python FastAPI backend:

### 1. Default Status on Report Save

```python
# In generate_incident_report() function
final_status = "submitted"  # Changed from "closed" or "pending_assessment"
```

### 2. Auto-Transition: Under Review → Action Required

```python
# After ai_mitigation is saved:
POST /api/reports/{id}/status
{
  "status": "action_required",
  "notes": "AI mitigation plan generated"
}
```

### 3. Status Update Endpoint

```python
# PATCH /api/reports/{id}/status
Request Body:
{
  "status": "submitted|under_review|action_required|in_progress|closed",
  "notes": "optional user notes",
  "closed_note": "optional closure notes"
}

Response: Updated SHEReport object with workflow.status updated
```

## Frontend Report List Display

The reports list (`src/pages/reports.tsx`) already includes status display:

- Each report card shows the current `workflow_status` badge
- Status badges use the color-coding from `WORKFLOW_STATUS_COLORS`
- Currently shows status if `workflow_status` field is present in the API response

## Data Flow

```
User Action → Frontend API Call → Backend Database Update → Workflow History Record
                ↓
           Query Invalidation
                ↓
           Report Refreshed with New Status
                ↓
           UI Updates with Visualization
```

## Usage Example

### For Safety Department Admin:

1. Open a report in detail view
2. Scroll to "Workflow Status" section
3. See the 5-stage visualization with current progress
4. Click "Update Status" button
5. Select new status and add optional notes
6. Click "Update Status" to save

### For Department Heads:

1. View their department's reports
2. Can see current status of each report
3. View full workflow history in report details
4. Cannot modify status (view-only)

## Current Limitations & Next Steps

### For Production Implementation:

1. **Backend Changes Required**:
   - Modify `generate_incident_report()` to set `status = "submitted"`
   - Implement auto-transition logic after AI mitigation is saved
   - Implement PATCH `/api/reports/{id}/status` endpoint with validation

2. **Frontend Features to Consider**:
   - Add filtering by workflow status in reports list
   - Add status change notifications/alerts
   - Add bulk status update capability
   - Add status change reason/approval workflow for critical transitions

3. **Audit & Compliance**:
   - Ensure workflow history captures WHO made each change
   - Add reason/justification field for all status changes
   - Implement status change approval process if needed

## Color Coding

The workflow uses intuitive color progression:

- **Blue** (Submitted): Starting point
- **Purple** (Under Review): Being examined
- **Orange** (Action Required): Needs action
- **Amber** (In Progress): Being worked on
- **Green** (Closed): Complete

## Files Modified/Created

**Created**:

- `src/components/workflow-status-visualization.tsx` - New component

**Modified**:

- `src/components/lib/she-api-types.ts` - Updated status colors and types
- `src/components/lib/she-api.ts` - Added updateReportStatus() function
- `src/pages/report-detail.tsx` - Added visualization, status dialog, and controls
- `src/pages/reports.tsx` - Already had status display logic (no changes needed)

## Testing Checklist

- [ ] Status visualization displays correctly for all 5 stages
- [ ] Safety Dept can see "Update Status" button
- [ ] Other departments cannot see "Update Status" button
- [ ] Status update dialog appears with all 5 options
- [ ] Can add optional notes to status changes
- [ ] Status updates successfully persist
- [ ] Workflow history updates immediately
- [ ] Report list shows correct status badges
- [ ] Can view archived reports and their final status
- [ ] Auto-transitions work correctly (backend testing)
