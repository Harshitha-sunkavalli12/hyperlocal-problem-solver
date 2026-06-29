import type { Status } from "../lib/types";
import { STATUS_COLOR } from "../lib/api";

const STEPS: Status[] = ["REPORTED", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"];
const LABEL: Record<Status, string> = {
  REPORTED: "Reported",
  VERIFIED: "Verified",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};

export default function StatusTracker({ status }: { status: Status }) {
  const current = STEPS.indexOf(status);
  return (
    <div className="flex items-center justify-between">
      {STEPS.map((s, i) => {
        const done = i <= current;
        return (
          <div key={s} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div
                  className="h-0.5 flex-1"
                  style={{ background: i <= current ? STATUS_COLOR[status] : "#374151" }}
                />
              )}
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  background: done ? STATUS_COLOR[s] : "#1f2937",
                  color: done ? "#0A0F1E" : "#9CA3AF",
                  boxShadow: i === current ? `0 0 14px ${STATUS_COLOR[s]}` : "none",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="h-0.5 flex-1"
                  style={{ background: i < current ? STATUS_COLOR[status] : "#374151" }}
                />
              )}
            </div>
            <span className={`mt-1 text-[9px] ${done ? "text-gray-200" : "text-gray-500"}`}>
              {LABEL[s]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
