import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

// Define the types for search results
type SearchResultType = 'contestant' | 'contingent' | 'team' | 'school' | 'participant';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Check authentication
  const session = await getServerSession(authOptions);
  
  // For debugging - temporarily bypass authentication in development
  if (process.env.NODE_ENV === 'development') {
    console.log('DEVELOPMENT MODE - Bypassing authentication for debugging');
  } else {
    // Verify user is authenticated and has organizer role
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify user has proper role (ADMIN, OPERATOR, or PARTICIPANTS_MANAGER)
    const allowedRoles = ['ADMIN', 'OPERATOR', 'PARTICIPANTS_MANAGER'];
    const userRole = (session.user as any).role;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }
  }
  try {
    // Get the search term from the URL
    const { searchParams } = new URL(request.url);
    const term = searchParams.get("term") || "";
    const filter = searchParams.get("filter") || "all";
    
    // Convert term to lowercase for case-insensitive comparison
    const lowerTerm = term.toLowerCase();
    
    // If search term is too short, return empty results
    if (term.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results: any[] = [];
    
    // Search for user participants (by email) if filter is 'all'
    if (filter === "all") {
      try {
        // Fetch user participants and filter in memory for case-insensitive search
        const allParticipants = await prisma.user_participant.findMany({
          include: {
            school: true,
            higherInstitution: true,
            contingents: {
              take: 1 // Just to check if they're managing any contingent
            },
          },
          // No limit to ensure we find email matches
        });
        
        console.log(`Found ${allParticipants.length} user participants total`);
        
        // Filter by email
        const participants = allParticipants.filter(participant => {
          return participant.email.toLowerCase().includes(lowerTerm);
        }).slice(0, 20); // Cap at 20 results
        
        console.log(`Found ${participants.length} participants matching email "${term}"`);

        results.push(
          ...participants.map((participant) => ({
            id: participant.id,
            type: "participant" as SearchResultType,
            name: participant.name,
            description: `Email: ${participant.email} | ${participant.contingents.length > 0 ? 'Manages contingent' : 'No contingent'}`,
            tags: [
              'Participant',
              participant.school ? "School" : null,
              participant.higherInstitution ? "Higher Institution" : null,
              participant.isActive ? "Active" : "Inactive",
            ].filter(Boolean),
            url: `/organizer/participants/${participant.id}`,
          }))
        );
      } catch (error) {
        console.error("Error searching participants:", error);
      }
    }
    
    // Search for contestants if filter is 'all' or 'contestant'
    if (filter === "all" || filter === "contestant") {
      try {
        // Use the lowercase term defined above
        
        // Fetch contestants and filter in memory for case-insensitive search
        const allContestants = await prisma.contestant.findMany({
          include: {
            contingent: true,
          },
          // Remove the limit to ensure all contestants are included
        });
        
        console.log(`Found ${allContestants.length} contestants total`);
        
        // Manual case-insensitive filtering - only name and ic as requested
        const contestants = allContestants.filter(contestant => {
          return (
            (contestant.name && contestant.name.toLowerCase().includes(lowerTerm)) ||
            (contestant.ic && contestant.ic.toLowerCase().includes(lowerTerm))
          );
        }).slice(0, 20); // Increased to show more results
        
        console.log(`Found ${contestants.length} contestants matching "${term}"`);

        results.push(
          ...contestants.map((contestant) => ({
            id: contestant.id,
            type: "contestant" as SearchResultType,
            name: contestant.name,
            description: `IC: ${contestant.ic || "N/A"} | ${
              contestant.contingent?.name || "No contingent"
            }`,
            tags: [
              contestant.gender,
              contestant.age ? `Age: ${contestant.age}` : null,
              contestant.edu_level,
            ].filter(Boolean),
            url: `/organizer/participants/contestants/${contestant.id}`,
          }))
        );
      } catch (error) {
        console.error("Error searching contestants:", error);
      }
    }

    // Search for contingents if filter is 'all' or 'contingent'
    if (filter === "all" || filter === "contingent") {
      try {
        // Fetch contingents and filter in memory
        const allContingents = await prisma.contingent.findMany({
          include: {
            school: true,
            higherInstitution: true,
            contestants: {
              select: {
                id: true,
              },
            },
          },
          // Remove the limit to ensure all contingents are included
        });
        
        console.log(`Found ${allContingents.length} contingents total`);
        
        // Dump first contingent for debugging if any exist
        if (allContingents.length > 0) {
          console.log('First contingent:', JSON.stringify(allContingents[0], null, 2));
        }
        
        // Manual case-insensitive filtering - only name as requested
        const contingents = allContingents.filter(contingent => {
          return (
            (contingent.name && contingent.name.toLowerCase().includes(lowerTerm))
          );
        }).slice(0, 20); // Increased to show more results
        
        console.log(`Found ${contingents.length} contingents matching "${term}"`);

        results.push(
          ...contingents.map((contingent) => ({
            id: contingent.id,
            type: "contingent" as SearchResultType,
            name: contingent.name,
            description: `${
              contingent.school?.name || contingent.higherInstitution?.name || "Independent"
            } | ${contingent.contestants.length} members`,
            logoUrl: contingent.logoUrl || undefined,
            tags: [
              contingent.school ? "School" : null,
              contingent.higherInstitution ? "Higher Institution" : null,
              "Active",
            ].filter(Boolean),
            url: `/organizer/contingents/${contingent.id}`,
          }))
        );
      } catch (error) {
        console.error("Error searching contingents:", error);
      }
    }

    // Search for schools if filter is 'all' or 'school'
    if (filter === "all" || filter === "school") {
      try {
        // Fetch schools and filter in memory
        const allSchools = await prisma.school.findMany({
          include: {
            contingent: {
              select: {
                id: true,
              },
            },
          },
          // Remove the limit to ensure all schools are included
        });
        
        console.log(`Found ${allSchools.length} schools total`);
        
        // Debug: Check if there are schools with 'simpang' or 'sungai' in their name
        const simpangSchools = allSchools.filter(s => 
          s.name && s.name.toLowerCase().includes('simpang')
        );
        const sungaiSchools = allSchools.filter(s => 
          s.name && s.name.toLowerCase().includes('sungai')
        );
        
        console.log(`DEBUG - Schools with 'simpang' in name: ${simpangSchools.length}`);
        console.log(`DEBUG - Schools with 'sungai' in name: ${sungaiSchools.length}`);
        
        if (simpangSchools.length > 0) {
          console.log(`DEBUG - First 'simpang' school: ${JSON.stringify(simpangSchools[0].name)}`);
        }
        if (sungaiSchools.length > 0) {
          console.log(`DEBUG - First 'sungai' school: ${JSON.stringify(sungaiSchools[0].name)}`);
        }
        
        // Manual case-insensitive filtering - only name as requested
        const schools = allSchools.filter(school => {
          const nameMatch = school.name && school.name.toLowerCase().includes(lowerTerm);
          
          // Debug specific search terms
          if (lowerTerm.includes('simpang') || lowerTerm.includes('sungai')) {
            console.log(`DEBUG - School: ${school.name}, Match for '${lowerTerm}': ${nameMatch}`);
          }
          
          return nameMatch;
        }).slice(0, 20); // Increased to show more results
        
        console.log(`Found ${schools.length} schools matching "${term}"`);
        
        // Extra debug for specific terms
        if (lowerTerm.includes('simpang')) {
          console.log(`DEBUG - Searching for 'simpang', found ${schools.length} matches`);
        } else if (lowerTerm.includes('sungai')) {
          console.log(`DEBUG - Searching for 'sungai', found ${schools.length} matches`);
        }

        results.push(
          ...schools.map((school) => ({
            id: school.id,
            type: "school" as SearchResultType,
            name: school.name,
            description: `Address: ${school.address || ""}, ${school.city || ""} ${
              school.postcode || ""
            }`,
            tags: [
              school.level || "School", // Use level instead of school_type
              `${school.contingent?.length || 0} Contingents`,
            ],
            url: `/organizer/participants/schools/${school.id}`,
          }))
        );
      } catch (error) {
        console.error("Error searching schools:", error);
      }
    }

    // Search for teams if filter is 'all' or 'team'
    if (filter === "all" || filter === "team") {
      try {
        // Fetch teams and filter in memory
        const allTeams = await prisma.team.findMany({
          // Remove the limit to ensure all teams are included
        });
        
        console.log(`Found ${allTeams.length} teams total`);
        
        // Manual case-insensitive filtering - only name as requested
        const teams = allTeams.filter(team => {
          return (
            (team.name && team.name.toLowerCase().includes(lowerTerm))
          );
        }).slice(0, 20); // Increased to show more results
        
        console.log(`Found ${teams.length} teams matching "${term}"`);

        // For each team, get additional info with separate queries
        const teamResults = await Promise.all(teams.map(async (team) => {
          // Get member count
          const memberCount = await prisma.teamMember.count({
            where: { teamId: team.id }
          });
          
          // Get contingent name
          const contingent = await prisma.contingent.findUnique({
            where: { id: team.contingentId },
            select: { name: true }
          });
          
          // Get contest name
          const contest = await prisma.contest.findUnique({
            where: { id: team.contestId },
            select: { name: true }
          });

          // Return formatted team data
          return {
            id: team.id,
            type: "team" as SearchResultType,
            name: team.name,
            description: `From ${contingent?.name || "No contingent"} | ${memberCount} members`,
            tags: [
              contest?.name || "No contest",
              team.status || "Active",
            ],
            url: `/organizer/participants/teams/${team.id}`,
          };
        }));

        // Add team results to the combined results
        results.push(...teamResults);
      } catch (error) {
        console.error("Error searching teams:", error);
      }
    }

    // For debugging
    console.log(`Search term: "${term}", Results count: ${results.length}`);
    
    // Return actual database results, even if empty
    if (results.length === 0) {
      console.log('No database results found for the search term.');
    }
    
    // Sort results by relevance (how closely the name matches the search term)
    results.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().indexOf(term.toLowerCase());
      const bNameMatch = b.name.toLowerCase().indexOf(term.toLowerCase());
      
      // Prioritize exact matches, then matches at start of name, then any match
      if (aNameMatch !== -1 && bNameMatch === -1) return -1;
      if (aNameMatch === -1 && bNameMatch !== -1) return 1;
      if (aNameMatch === 0 && bNameMatch !== 0) return -1;
      if (aNameMatch !== 0 && bNameMatch === 0) return 1;
      return aNameMatch - bNameMatch;
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error searching:", error);
    return NextResponse.json(
      { error: "Failed to search. Please try again." },
      { status: 500 }
    );
  }
}
