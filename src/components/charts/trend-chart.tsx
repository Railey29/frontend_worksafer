import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendChartProps {
  data: Array<{
    name: string;
    value: number;
    date: string;
  }>;
  title: string;
  color?: string;
  startDate?: string;
  endDate?: string;
}

export function TrendChart({
  data,
  title,
  color = "#2563EB",
  startDate,
  endDate,
}: TrendChartProps) {
  const [start, setStart] = useState(startDate ?? "");
  const [end, setEnd] = useState(endDate ?? "");
  const [filter, setFilter] = useState("all");

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFilter(value);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = today.toISOString().split("T")[0];

    let startDate = "";
    if (value === "7") {
      const date = new Date(today);
      date.setDate(date.getDate() - 7);
      startDate = date.toISOString().split("T")[0];
    } else if (value === "30") {
      const date = new Date(today);
      date.setDate(date.getDate() - 30);
      startDate = date.toISOString().split("T")[0];
    } else if (value === "90") {
      const date = new Date(today);
      date.setDate(date.getDate() - 90);
      startDate = date.toISOString().split("T")[0];
    }

    setStart(startDate);
    setEnd(endDate);
  };

  const filtered = data.filter(({ date }) => {
    const d = new Date(date);
    if (start && d < new Date(start)) return false;
    if (end && d > new Date(end)) return false;
    return true;
  });

  return (
    <div className="w-full">
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-end gap-3">
          <select
            value={filter}
            onChange={handleFilterChange}
            className="text-sm border border-gray-300 rounded px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">Start</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">End</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
