const fs = require('fs');
const path = require('path');

// Path to the route file with the [] character that needs escaping
const routeFilePath = path.join(__dirname, 'src/app/api/judging-templates/[id]/route.ts');

// Read the current content
let content = fs.readFileSync(routeFilePath, 'utf8');

// Update import statements if not already updated
if (content.includes("import { getCurrentUser, hasRequiredRole } from '@/lib/auth';")) {
  content = content.replace(
    "import { getCurrentUser, hasRequiredRole } from '@/lib/auth';",
    "import { getServerSession } from 'next-auth/next';\nimport { authOptions } from '@/app/api/auth/auth-options';\nimport { hasRequiredRole } from '@/lib/auth';\n\n// Force dynamic route\nexport const dynamic = 'force-dynamic';"
  );
  console.log('Updated import statements');
} else {
  console.log('Import statements already updated or in unexpected format');
}

// Update GET handler authentication
content = content.replace(
  "const user = await getCurrentUser();",
  "const session = await getServerSession(authOptions);"
);

content = content.replace(
  "if (!user || !hasRequiredRole(user, ['ADMIN', 'ORGANIZER'])) {",
  "if (!session || !session.user || !hasRequiredRole(session.user, ['ADMIN', 'ORGANIZER'])) {"
);

// Update PUT handler authentication
content = content.replace(
  "const user = await getCurrentUser();",
  "const session = await getServerSession(authOptions);"
);

content = content.replace(
  "if (!user || !hasRequiredRole(user, ['ADMIN', 'ORGANIZER'])) {",
  "if (!session || !session.user || !hasRequiredRole(session.user, ['ADMIN', 'ORGANIZER'])) {"
);

// Update DELETE handler authentication
content = content.replace(
  "const user = await getCurrentUser();",
  "const session = await getServerSession(authOptions);"
);

content = content.replace(
  "if (!user || !hasRequiredRole(user, ['ADMIN', 'ORGANIZER'])) {",
  "if (!session || !session.user || !hasRequiredRole(session.user, ['ADMIN', 'ORGANIZER'])) {"
);

// Write the updated content back
fs.writeFileSync(routeFilePath, content, 'utf8');
console.log('Authentication updated for [id]/route.ts');
