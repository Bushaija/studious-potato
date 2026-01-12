# Database Seeding Guide

## Admin User Seeding

The admin user seeding process follows best practices for security and idempotency.

### Configuration

Set these environment variables in your `.env` file:

```env
# Admin User Seeding Configuration
CREATE_ADMIN=true                    # Set to false to disable admin creation
ADMIN_EMAIL=admin@gmail.com          # Admin user email
ADMIN_PASSWORD=kinyarwanda           # Admin user password (change in production!)
```

### Running Seeds

```bash
# Run all seeds (including admin user)
npm run db:seed

# Or using pnpm
pnpm db:seed
```

### Idempotency

The seeding script is **idempotent** - it can be run multiple times safely:

- ✅ If admin user doesn't exist → Creates user and account
- ✅ If admin user exists but account is missing → Creates account only
- ✅ If both user and account exist → Skips creation (no changes)

### Security Best Practices

1. **Never commit credentials** - Use environment variables
2. **Change default password** - Update password after first login
3. **Use strong passwords** - Especially in production environments
4. **Disable in production** - Set `CREATE_ADMIN=false` after initial setup

### Password Hashing

The seed script uses **scrypt** (Better Auth default):
- Memory-hard algorithm (resistant to brute-force attacks)
- Native to Node.js (no external dependencies)
- Format: `salt:hash` (both hex-encoded)

### Troubleshooting

**Admin user exists but can't login?**
```sql
-- Check if account exists
SELECT * FROM account WHERE account_id = 'admin@gmail.com';
```

If no account exists, you have an inconsistent state:
1. Delete the user record:
   ```sql
   DELETE FROM users WHERE email = 'admin@gmail.com';
   ```
2. Re-run the seed script

**Want to reset admin password?**
1. Delete both user and account records:
   ```sql
   DELETE FROM account WHERE account_id = 'admin@gmail.com';
   DELETE FROM users WHERE email = 'admin@gmail.com';
   ```
2. Re-run the seed script

### Example Output

```
Seeding admin user...
Found facility: ruhengeri referral in musanze district (ID: 123)
Creating new admin user: admin@gmail.com
Admin user created with ID: 456
Admin user seeded successfully!
Login credentials:
  Email: admin@gmail.com
  Password: kinyarwanda
  Role: admin
  Facility: ruhengeri referral (musanze district)

⚠️  IMPORTANT: Change the admin password after first login!
```
