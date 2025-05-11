'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

type ContingentStateData = {
  state: string;
  count: number;
}

export default function ContingentStateChart({ data }: { data: ContingentStateData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contingents by State</CardTitle>
        <CardDescription>Distribution of contingents across Malaysian states</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="state" type="category" width={80} />
              <Tooltip formatter={(value) => [`${value} contingents`, 'Count']} />
              <Bar dataKey="count" fill="#8884d8">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
