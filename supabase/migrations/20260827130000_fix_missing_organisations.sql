-- P2.4 FIX: Ensure all users have corresponding entries in organisations
INSERT INTO organisations (organisation_id, legal_name, status, created_at)
SELECT u.id, COALESCE(bi.legal_name, u.first_name || ' ' || u.last_name, 'Unknown'), 'active', u.created_at
FROM users u
LEFT JOIN business_identity bi ON bi.user_id = u.id
WHERE NOT EXISTS (SELECT 1 FROM organisations o WHERE o.organisation_id = u.id)
ON CONFLICT DO NOTHING;
