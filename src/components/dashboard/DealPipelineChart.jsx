import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const stageColors = {
  prospecting: "#94a3b8",
  controlled_not_approved: "#60a5fa",
  controlled_approved: "#f59e0b",
  entitlements: "#a855f7",
  development: "#22c55e",
  closed: "#10b981",
  dead: "#ef4444"
};

const stageLabels = {
  prospecting: "Prospecting",
  controlled_not_approved: "Controlled/Not Approved",
  controlled_approved: "Controlled/Approved",
  entitlements: "Entitlements",
  development: "Development",
  closed: "Closed",
  dead: "Dead"
};

export default function DealPipelineChart({ deals }) {
  const pipelineData = Object.keys(stageLabels).map(stage => ({
    stage: stageLabels[stage],
    count: deals.filter(d => d.stage === stage).length,
    value: deals.filter(d => d.stage === stage).reduce((sum, d) => sum + (d.estimated_value || 0), 0),
    key: stage
  })).filter(d => d.key !== 'dead' && d.key !== 'closed');

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900">Deal Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipelineData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="stage" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                width={100}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-sm shadow-lg">
                        <p className="font-medium">{data.stage}</p>
                        <p>{data.count} deals</p>
                        <p>${(data.value / 1000000).toFixed(1)}M value</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={32}>
                {pipelineData.map((entry) => (
                  <Cell key={entry.key} fill={stageColors[entry.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}