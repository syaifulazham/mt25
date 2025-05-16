import { NextResponse } from "next/server";
import { prismaExecute } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { format } from "date-fns";

export async function GET(request: Request) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Fetch the earliest contest participation record to determine start date
    const earliestRecord = await prismaExecute(async (prisma) => {
      return prisma.contestParticipation.findFirst({
        orderBy: {
          registeredAt: 'asc'
        }
      });
    });
    
    // If no records exist, return empty data
    if (!earliestRecord || !earliestRecord.registeredAt) {
      return NextResponse.json({ data: [] });
    }
    
    // Set the start date to the earliest record's date or default to 3 months ago if too old
    let startDate = earliestRecord.registeredAt;
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    if (startDate < threeMonthsAgo) {
      startDate = threeMonthsAgo;
    }
    
    // Format the start date as YYYY-MM-DD for SQL query
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    
    let participationData: Array<{date: string, count: number}> = [];
    
    try {
      // Fetch all registrations using findMany instead of raw SQL
      const registrations = await prismaExecute(async (prisma) => {
        return prisma.contestParticipation.findMany({
          select: {
            registeredAt: true,
            id: true
          },
          where: {
            registeredAt: {
              gte: startDate
            }
          },
          orderBy: {
            registeredAt: 'asc'
          }
        });
      });
      
      // Process the results and group by date
      const dateMap = new Map<string, number>();
      
      for (const item of registrations) {
        if (item.registeredAt) {
          const dateStr = format(item.registeredAt, 'yyyy-MM-dd');
          const currentCount = dateMap.get(dateStr) || 0;
          dateMap.set(dateStr, currentCount + 1);
        }
      }
      
      // Convert to our desired format
      participationData = Array.from(dateMap.entries()).map(([date, count]) => ({
        date,
        count
      }));
      
    } catch (error) {
      console.error("Error fetching data with Prisma:", error);
      
      // Fall back to raw SQL as a backup
      try {
        const results = await prismaExecute(async (prisma) => {
          return prisma.$queryRaw`
            SELECT 
              DATE(registeredAt) as date, 
              COUNT(*) as count 
            FROM contestParticipation
            WHERE DATE(registeredAt) >= ${formattedStartDate}
            GROUP BY DATE(registeredAt)
            ORDER BY date ASC
          `;
        });
        
        if (Array.isArray(results) && results.length > 0) {
          participationData = results.map((item: any) => ({
            date: typeof item.date === 'string' ? item.date : format(item.date, 'yyyy-MM-dd'),
            count: Number(item.count || 0)
          }));
        }
      } catch (finalErr) {
        console.error('All database attempts failed:', finalErr);
        // Leave participationData as empty array
      }
    }
    
    // If we have no data, create empty dataset with all dates from start to today
    if (participationData.length === 0) {
      const dates = [];
      const currentDate = new Date(startDate);
      const endDate = new Date();
      
      while (currentDate <= endDate) {
        dates.push({
          date: format(currentDate, 'yyyy-MM-dd'),
          count: 0
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return NextResponse.json({ data: dates });
    }
    
    // Fill in missing dates with count 0
    const filledResults = fillMissingDates(participationData, startDate);
    
    return NextResponse.json({ data: filledResults });
    
  } catch (error) {
    console.error("Error fetching participation history:", error);
    return NextResponse.json(
      { error: "Failed to fetch participation history" },
      { status: 500 }
    );
  }
}

// Helper function to fill in missing dates with count 0
function fillMissingDates(data: Array<{date: string, count: number}>, startDate: Date) {
  const dateMap = new Map<string, number>();
  data.forEach(item => {
    dateMap.set(item.date, item.count);
  });
  
  const result = [];
  const currentDate = new Date(startDate);
  const endDate = new Date(); // today
  
  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    result.push({
      date: dateStr,
      count: dateMap.get(dateStr) || 0
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return result;
}
