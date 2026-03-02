import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { checkQuizAuthorization } from "../../auth-utils";

export const dynamic = "force-dynamic";

function formatStateName(stateName: string | null): string {
  if (!stateName) return "Unknown";

  const upperStateName = stateName.toUpperCase();

  if (upperStateName.includes("NEGERI SEMBILAN")) return "N9";
  if (upperStateName.includes("PULAU PINANG")) return "P. PINANG";
  if (upperStateName.includes("KUALA LUMPUR")) return "KUALA LUMPUR";
  if (upperStateName.includes("WILAYAH PERSEKUTUAN KUALA LUMPUR")) return "WP KUALA LUMPUR";
  if (upperStateName.includes("WILAYAH PERSEKUTUAN")) {
    return `WP ${upperStateName.replace("WILAYAH PERSEKUTUAN", "").trim()}`;
  }

  return stateName;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const authCheck = await checkQuizAuthorization(user);

    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const quizId = parseInt(params.id);
    if (isNaN(quizId)) {
      return NextResponse.json({ error: "Invalid quiz ID" }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const attempts = await prisma.quiz_attempt.findMany({
      where: { quizId },
      select: {
        contestantId: true,
        contestant: {
          select: {
            contingent: {
              select: {
                contingentType: true,
                school: {
                  select: {
                    state: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                higherInstitution: {
                  select: {
                    state: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                independent: {
                  select: {
                    state: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const stateMap = new Map<string, { stateId: number | null; contestantIds: Set<number> }>();
    const uniqueContestantIds = new Set<number>();

    for (const attempt of attempts) {
      const contestantId = attempt.contestantId;
      uniqueContestantIds.add(contestantId);

      const contingent = attempt.contestant?.contingent;

      let stateName: string | null = "Unknown";
      let stateId: number | null = null;

      if (contingent) {
        const contingentType = contingent.contingentType;

        if (contingentType === "SCHOOL" && contingent.school?.state?.name) {
          stateName = contingent.school.state.name;
          stateId = contingent.school.state.id;
        } else if (
          contingentType === "HIGHER_INSTITUTION" &&
          contingent.higherInstitution?.state?.name
        ) {
          stateName = contingent.higherInstitution.state.name;
          stateId = contingent.higherInstitution.state.id;
        } else if (
          contingentType === "INDEPENDENT" &&
          contingent.independent?.state?.name
        ) {
          stateName = contingent.independent.state.name;
          stateId = contingent.independent.state.id;
        }
      }

      const formattedStateName = formatStateName(stateName);
      const existing = stateMap.get(formattedStateName);

      if (existing) {
        existing.contestantIds.add(contestantId);
      } else {
        const contestantIds = new Set<number>();
        contestantIds.add(contestantId);
        stateMap.set(formattedStateName, { stateId, contestantIds });
      }
    }

    const stateSummaries = Array.from(stateMap.entries())
      .map(([state, value]) => ({
        state,
        stateId: value.stateId,
        participants: value.contestantIds.size,
      }))
      .sort((a, b) => a.state.localeCompare(b.state));

    return NextResponse.json({
      quizId,
      totalParticipants: uniqueContestantIds.size,
      stateSummaries,
    });
  } catch (error) {
    console.error("Error fetching quiz participation by state:", error);
    return NextResponse.json(
      { error: "Failed to load quiz participation summary" },
      { status: 500 }
    );
  }
}
