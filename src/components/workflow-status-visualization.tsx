import React from "react";
import { WORKFLOW_STATUS_COLORS } from "./lib/she-api-types";

const WORKFLOW_STAGES = [
  { key: "submitted",       label: "Submitted" },
  { key: "under_review",    label: "Under Review" },
  { key: "action_required", label: "Action Required" },
  { key: "in_progress",     label: "In Progress" },
  { key: "closed",          label: "Closed" },
];

interface WorkflowStatusVisualizationProps {
  currentStatus: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const CheckIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    <polyline
      points="2,7 5.5,10.5 12,3.5"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function WorkflowStatusVisualization({
  currentStatus,
  className = "",
  size = "md",
}: WorkflowStatusVisualizationProps) {
  const currentStage = Math.max(
    0,
    WORKFLOW_STAGES.findIndex((s) => s.key === currentStatus),
  );

  const circleSizeMap = {
    sm: { outer: "h-7 w-7", iconPx: 12, text: "text-xs" },
    md: { outer: "h-9 w-9", iconPx: 14, text: "text-sm" },
    lg: { outer: "h-11 w-11", iconPx: 16, text: "text-base" },
  };

  const { outer, iconPx, text } = circleSizeMap[size];
  const currentLabel =
    WORKFLOW_STATUS_COLORS[currentStatus]?.label ||
    WORKFLOW_STAGES[currentStage]?.label ||
    currentStatus;

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {/* Stepper row */}
      <div className="flex items-start">
        {WORKFLOW_STAGES.map((stage, index) => {
          const isCompleted = index < currentStage;
          const isCurrent = index === currentStage;
          const isPending = index > currentStage;

          return (
            <React.Fragment key={stage.key}>
              {/* Step */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div
                  className={`
                    ${outer} rounded-full
                    flex items-center justify-center
                    font-medium transition-all duration-300
                    ${isCompleted
                      ? "bg-blue-600 text-white"
                      : isCurrent
                      ? "bg-white border-2 border-blue-600 text-blue-600 ring-4 ring-blue-100"
                      : "bg-white border border-gray-200 text-gray-400"
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckIcon size={iconPx} />
                  ) : (
                    <span className={`${text} leading-none`}>{index + 1}</span>
                  )}
                </div>
                <span
                  className={`
                    ${text} text-center whitespace-nowrap leading-tight
                    ${isCurrent ? "text-gray-900 font-medium" : ""}
                    ${isCompleted ? "text-gray-700" : ""}
                    ${isPending ? "text-gray-400" : ""}
                  `}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connector */}
              {index < WORKFLOW_STAGES.length - 1 && (
                <div
                  className={`
                    flex-1 h-px mt-4 mx-2 transition-colors duration-300
                    ${isCompleted ? "bg-blue-600" : "bg-gray-200"}
                  `}
                  style={{ minWidth: "32px" }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Status pill */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 w-fit">
        <div className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
        <p className="text-sm text-gray-500">
          Current status:{" "}
          <span className="font-medium text-gray-900">{currentLabel}</span>
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
  const currentStage = Math.max(
    0,
    WORKFLOW_STAGES.findIndex((s) => s.key === currentStatus),
  );

  return (
    <div className={`space-y-1 ${className}`}>
      {WORKFLOW_STAGES.map((stage, index) => {
        const isCompleted = index < currentStage;
        const isCurrent = index === currentStage;
        const isPending = index > currentStage;

        return (
          <div key={stage.key} className="flex items-center gap-3 py-1">
            {/* Circle */}
            <div
              className={`
                h-7 w-7 rounded-full shrink-0
                flex items-center justify-center
                font-medium text-xs
                transition-all duration-200
                ${isCompleted
                  ? "bg-blue-600 text-white"
                  : isCurrent
                  ? "bg-white border-2 border-blue-600 text-blue-600 ring-2 ring-blue-100"
                  : "bg-white border border-gray-200 text-gray-400"
                }
              `}
            >
              {isCompleted ? (
                <CheckIcon size={11} />
              ) : (
                <span className="leading-none">{index + 1}</span>
              )}
            </div>

            {/* Label */}
            <span
              className={`
                text-sm leading-tight flex-1
                ${isCurrent ? "font-medium text-gray-900" : ""}
                ${isCompleted ? "text-gray-600" : ""}
                ${isPending ? "text-gray-400" : ""}
              `}
            >
              {stage.label}
            </span>

            {/* Current badge */}
            {isCurrent && (
              <span className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                Current
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}