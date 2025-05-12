'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Chart colors for gender representation
const GENDER_COLORS = {
  MALE: '#0088FE',  // Blue for male
  FEMALE: '#FF6B93'  // Pink for female
};

type ParticipationStateData = {
  state: string;
  MALE: number;
  FEMALE: number;
}

export default function ParticipationStateChart({ data }: { data: ParticipationStateData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contest Participations by State and Gender</CardTitle>
        <CardDescription>Distribution of contest participations by gender across states</CardDescription>
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
              <Tooltip formatter={(value, name) => [`${value} participants`, name]} />
              <Legend />
              <Bar dataKey="MALE" stackId="a" fill={GENDER_COLORS.MALE} name="Male">
                <LabelList dataKey="MALE" position="inside" fill="#FFFFFF" />
              </Bar>
              <Bar dataKey="FEMALE" stackId="a" fill={GENDER_COLORS.FEMALE} name="Female">
                <LabelList dataKey="FEMALE" position="inside" fill="#FFFFFF" />
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
