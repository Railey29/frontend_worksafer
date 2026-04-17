import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface HazardDistributionChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  title: string;
  startDate?: string;
  endDate?: string;
}

export function HazardDistributionChart({
  data,
  title,
  startDate,
  endDate,
}: HazardDistributionChartProps) {
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

  return (
    <div className="w-full">
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <h4 className="font-medium text-gray-900">{title}</h4>
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
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
