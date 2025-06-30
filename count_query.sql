SELECT COUNT(*) FROM team WHERE id IN (SELECT teamId FROM eventcontestteam);
