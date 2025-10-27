import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const endpointId = parseInt(params.id);
    if (isNaN(endpointId)) {
      return NextResponse.json({ error: 'Invalid endpoint ID' }, { status: 400 });
    }

    const body = await request.json();
    const { judge_name, judge_ic, judge_email, judge_phoneNo } = body;

    // Update the judge endpoint using Prisma
    const updatedEndpoint = await prisma.judges_endpoints.update({
      where: {
        id: endpointId
      },
      data: {
        judge_name: judge_name || '',
        judge_ic: judge_ic || '',
        judge_email: judge_email || '',
        judge_phoneNo: judge_phoneNo || ''
      },
      include: {
        event: {
          select: {
            id: true,
            name: true
          }
        },
        contest: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    return NextResponse.json(updatedEndpoint);
  } catch (error) {
    console.error('Error updating judge endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to update judge endpoint' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const endpointId = parseInt(params.id);
    if (isNaN(endpointId)) {
      return NextResponse.json({ error: 'Invalid endpoint ID' }, { status: 400 });
    }

    // Delete the judge endpoint using Prisma
    await prisma.judges_endpoints.delete({
      where: {
        id: endpointId
      }
    });

    return NextResponse.json({ message: 'Judge endpoint deleted successfully' });
  } catch (error) {
    console.error('Error deleting judge endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to delete judge endpoint' },
      { status: 500 }
    );
  }
}
