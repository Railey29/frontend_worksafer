import React from "react";
import { WORKFLOW_STATUS_COLORS } from "./lib/she-api-types";

// The 5-stage workflow progression
const WORKFLOW_STAGES = [
  { key: "submitted", label: "Submitted", order: 0 },
  { key: "under_review", label: "Under Review", order: 1 },
  { key: "action_required", label: "Action Required", order: 2 },
  { key: "in_progress", label: "In Progress", order: 3 },
  { key: "closed", label: "Closed", order: 4 },
];

interface WorkflowStatusVisualizationProps {
  currentStatus: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function WorkflowStatusVisualization({
  currentStatus,
  className = "",
  size = "md",
}: WorkflowStatusVisualizationProps) {
  // Find current stage index
  const currentStage = WORKFLOW_STAGES.findIndex(
    (s) => s.key === currentStatus,
  );

  const dotSizeMap = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const textSizeMap = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const dotSize = dotSizeMap[size];
  const textSize = textSizeMap[size];

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Horizontal workflow visualization */}
      <div className="flex items-center justify-between">
        {WORKFLOW_STAGES.map((stage, index) => {
          const isCompleted = index <= currentStage;
          const isCurrent = index === currentStage;
          const colors = WORKFLOW_STATUS_COLORS[stage.key] || {
            bg: "bg-gray-100",
            text: "text-gray-800",
            label: stage.label,
          };

          return (
            <React.Fragment key={stage.key}>
              {/* Dot */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`
                    ${dotSize}
                    rounded-full
                    flex items-center justify-center
                    font-semibold
                    transition-all duration-300
                    ${isCurrent ? "ring-2 ring-offset-2 scale-110" : ""}
                    ${isCompleted ? colors.bg + " " + colors.text : "bg-gray-200 text-gray-500"}
                  `}
                >
                  {index + 1}
                </div>
                <span
                  className={`${textSize} font-medium text-gray-900 text-center whitespace-nowrap`}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connector line */}
              {index < WORKFLOW_STAGES.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    isCompleted ? colors.bg : "bg-gray-200"
                  } transition-colors duration-300`}
                  style={{ minWidth: "40px" }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Status information */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div
          className={`h-3 w-3 rounded-full ${WORKFLOW_STATUS_COLORS[currentStatus]?.bg.replace("bg-", "bg-")}`}
        />
        <p className="text-sm text-gray-700">
          Current Status:{" "}
          <strong>
            {WORKFLOW_STATUS_COLORS[currentStatus]?.label || currentStatus}
          </strong>
        </p>
      </div>
    </div>
  );
}

// Compact vertical version for sidebars
export function WorkflowStatusVisualizationCompact({
  currentStatus,
  className = "",
}: {
  currentStatus: string;
  className?: string;
}) {
  const currentStage = WORKFLOW_STAGES.findIndex(
    (s) => s.key === currentStatus,
  );

  return (
    <div className={`space-y-2 ${className}`}>
      {WORKFLOW_STAGES.map((stage, index) => {
        const isCompleted = index <= currentStage;
        const isCurrent = index === currentStage;
        const colors = WORKFLOW_STATUS_COLORS[stage.key] || {
          bg: "bg-gray-100",
          text: "text-gray-800",
          label: stage.label,
        };

        return (
          <div key={stage.key} className="flex items-center gap-3">
            <div
              className={`
                h-6 w-6
                rounded-full
                flex items-center justify-center
                font-semibold text-xs
                transition-all duration-300
                ${isCurrent ? "ring-2 ring-offset-1 scale-110" : ""}
                ${isCompleted ? colors.bg + " " + colors.text : "bg-gray-200 text-gray-500"}
              `}
            >
              {index + 1}
            </div>
            <span
              className={`text-sm font-medium ${
                isCurrent ? "font-bold text-gray-900" : "text-gray-600"
              }`}
            >
              {stage.label}
            </span>
            {isCurrent && (
              <span className="ml-auto text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                Current
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
