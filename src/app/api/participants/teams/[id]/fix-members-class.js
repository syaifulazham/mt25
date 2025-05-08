// Code to update in route.ts - Add these fields to contestant select
/*
members: {
  include: {
    contestant: {
      select: {
        id: true,
        name: true,
        ic: true,
        gender: true,
        age: true,
        edu_level: true,
        class_grade: true,  // Add this field
        class_name: true,   // Add this field
        email: true,
        phoneNumber: true,
        status: true
      }
    }
  }
}
*/

// Code to update in response formatting - Add className
/*
const formattedMembers = updatedTeam.members.map(member => ({
  id: member.id,
  contestantId: member.contestantId,
  contestantName: member.contestant.name,
  status: member.contestant.status || "ACTIVE",
  joinDate: new Date().toISOString(),
  icNumber: member.contestant.ic,
  email: member.contestant.email,
  gender: member.contestant.gender,
  educationLevel: member.contestant.edu_level,
  classGrade: member.contestant.class_grade,
  className: member.contestant.class_name  // Add this field
}));
*/
