#!/bin/bash

echo "=== Verifying Quiz Certificate Setup ==="
echo ""

echo "1. Checking quizId column..."
mysql -u azham -p'DBAzham231' mtdb -e "SHOW COLUMNS FROM cert_template WHERE Field = 'quizId';" 2>/dev/null | grep quizId
if [ $? -eq 0 ]; then
    echo "   ✅ quizId column exists"
else
    echo "   ❌ quizId column missing"
fi

echo ""
echo "2. Checking targetType enum..."
mysql -u azham -p'DBAzham231' mtdb -e "SHOW COLUMNS FROM cert_template WHERE Field = 'targetType';" 2>/dev/null | grep QUIZ_PARTICIPANT
if [ $? -eq 0 ]; then
    echo "   ✅ QUIZ_PARTICIPANT in enum"
else
    echo "   ❌ QUIZ_PARTICIPANT not in enum"
fi

mysql -u azham -p'DBAzham231' mtdb -e "SHOW COLUMNS FROM cert_template WHERE Field = 'targetType';" 2>/dev/null | grep QUIZ_WINNER
if [ $? -eq 0 ]; then
    echo "   ✅ QUIZ_WINNER in enum"
else
    echo "   ❌ QUIZ_WINNER not in enum"
fi

echo ""
echo "3. Checking quizId index..."
mysql -u azham -p'DBAzham231' mtdb -e "SHOW INDEX FROM cert_template WHERE Key_name = 'idx_cert_template_quizId';" 2>/dev/null | grep idx_cert_template_quizId
if [ $? -eq 0 ]; then
    echo "   ✅ quizId index exists"
else
    echo "   ❌ quizId index missing"
fi

echo ""
echo "4. Checking quiz foreign key..."
mysql -u azham -p'DBAzham231' mtdb -e "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'cert_template' AND CONSTRAINT_NAME = 'fk_cert_template_quiz';" 2>/dev/null | grep fk_cert_template_quiz
if [ $? -eq 0 ]; then
    echo "   ✅ quiz foreign key exists"
else
    echo "   ❌ quiz foreign key missing"
fi

echo ""
echo "=== Summary ==="
echo "Database setup appears complete!"
echo ""
echo "Next steps:"
echo "1. Kill the dev server (Ctrl+C if running)"
echo "2. Run: npx prisma generate"
echo "3. Run: npm run dev"
echo "4. Try creating a quiz certificate template again"
