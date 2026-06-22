import { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import api from '../api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const PRIORITY_COLORS = {
  'High': '#f43f5e',
  'Medium': '#f59e0b',
  'Low': '#10b981'
};

export default function AnalyticsTab({ darkMode }) {
  const [completionData, setCompletionData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [priorityData, setPriorityData] = useState([]);
  const [overviewData, setOverviewData] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [trendsRes, overviewRes, catRes, priorityRes] = await Promise.all([
          api.get('/tasks/analytics/completion-trends'),
          api.get('/tasks/analytics/overview'),
          api.get('/tasks/analytics/category-distribution'),
          api.get('/tasks/analytics/priority-distribution')
        ]);

        setCompletionData(trendsRes.data
          .filter(item => item.completion_date)
          .map(item => ({
            date: item.completion_date,
            'Completed Tasks': item.completed_tasks_count,
          }))
        );

        setOverviewData(overviewRes.data || null);
        setCategoryData(catRes.data);
        setPriorityData(priorityRes.data);
        
        const tasksRes = await api.get('/tasks', { params: { status: 'Completed' } });
        const completedTasks = tasksRes.data.filter(
          (t) => t.estimated_minutes != null && t.time_spent_minutes != null
        );

        const performance = completedTasks
          .slice(-5)
          .map((t) => ({
            name: t.title.substring(0, 12) + (t.title.length > 12 ? '...' : ''),
            Estimate: t.estimated_minutes,
            Actual: t.time_spent_minutes,
          }));

        setPerformanceData(performance);
      } catch (err) {
        console.error("Failed to fetch analytics data:", err);
        setError("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#6366f1", fontWeight: "600" }}>
        Loading analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#ef4444", fontWeight: "600" }}>
        {error}
      </div>
    );
  }

  const emptyAnalytics = !overviewData
    && completionData.length === 0
    && categoryData.length === 0
    && priorityData.length === 0
    && performanceData.length === 0;

  const renderEmptyChart = (message) => (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "#64748b" }}>
      <div style={{ fontSize: "28px", marginBottom: "12px" }}>📉</div>
      <div style={{ fontSize: "16px", fontWeight: 600 }}>{message}</div>
    </div>
  );

  if (emptyAnalytics) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", background: "#f8fafc", borderRadius: "12px", border: "2px dashed #e2e8f0", color: "#64748b" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>📊</div>
        <h3 style={{ margin: "0 0 8px 0" }}>No analytics data available</h3>
        <p style={{ margin: 0 }}>Start by creating tasks and completing them to populate your analytics.</p>
      </div>
    );
  }

  const formatValue = (value, suffix = "") => {
    if (value == null || Number.isNaN(Number(value))) return "—";
    return `${Number(value).toFixed(suffix ? 0 : 1)}${suffix}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {overviewData && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>Completed</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#10b981" }}>{overviewData.completed_count ?? 0}</div>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>Pending</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#f59e0b" }}>{overviewData.pending_count ?? 0}</div>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>Overdue</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#ef4444" }}>{overviewData.overdue_count ?? 0}</div>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>Avg Time Spent</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0f766e" }}>{overviewData.avg_time_spent != null ? `${Number(overviewData.avg_time_spent).toFixed(1)}m` : "—"}</div>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>Avg Estimate Error</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#6366f1" }}>{overviewData.avg_estimate_error != null ? `${Number(overviewData.avg_estimate_error).toFixed(1)}m` : "—"}</div>
          </div>
        </div>
      )}

      {/* Completion Trends Line Chart */}
      <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", color: "#1e293b" }}>Task Completion Trends</h3>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#64748b" }}>Your productivity over time</p>
        </div>
        {completionData.length === 0 ? renderEmptyChart("No completed tasks yet.") : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={completionData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} 
                labelStyle={{ color: '#1e293b', fontWeight: '600' }} 
                itemStyle={{ color: '#475569' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Line type="monotone" dataKey="Completed Tasks" stroke="#6366f1" activeDot={{ r: 8 }} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        {/* Category Distribution Pie Chart */}
        <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", color: "#1e293b" }}>Tasks by Category</h3>
          {categoryData.length === 0 ? renderEmptyChart("No category distribution available yet.") : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Priority Distribution Bar Chart */}
        <div style={{ background: darkMode ? "#1e293b" : "white", padding: "24px", borderRadius: "16px", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", color: darkMode ? "#f1f5f9" : "#1e293b" }}>Tasks by Priority</h3>
          {priorityData.length === 0 ? renderEmptyChart("No priority breakdown available yet.") : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#e2e8f0"} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", color: "#1e293b" }}>Recent Task Time Performance</h3>
            <p style={{ margin: "6px 0 0 0", color: "#64748b", fontSize: "14px" }}>Compare estimated time vs actual time spent on your most recent completed tasks.</p>
          </div>
          <div style={{ textAlign: "right", minWidth: "120px" }}>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f766e" }}>{performanceData.length}</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>tasks shown</div>
          </div>
        </div>

        {performanceData.length === 0 ? renderEmptyChart("No performance data available yet.") : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="Estimate" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}