import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prismaExecute } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/auth-options";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session to verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the participant ID
    const participantId = parseInt(params.id);
    if (isNaN(participantId)) {
      return NextResponse.json(
        { error: "Invalid participant ID" },
        { status: 400 }
      );
    }

    // Extract the status filter from query parameters if provided
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    // Define the where clause based on the participant ID and optional status filter
    const whereClause: any = {
      participantId: participantId,
    };

    // Add status filter if provided
    if (statusFilter) {
      whereClause.status = statusFilter;
    }

    // Fetch the participant's pending contingent requests
    const requests = await prismaExecute(async (prisma) => {
      return prisma.contingentRequest.findMany({
        where: whereClause,
        include: {
          contingent: {
            include: {
              school: true,
              higherInstitution: true,
              independent: {
                include: {
                  state: true
                }
              },
              managers: {
                // Include all managers, we'll filter for primary ones in the client if needed
                include: {
                  participant: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Error fetching user contingent requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch user contingent requests" },
      { status: 500 }
    );
  }
}
