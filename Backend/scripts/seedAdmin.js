/**
 * Seed script for initial System Administrator account.
 * Prevents privilege escalation by ensuring Admin accounts cannot self-register,
 * and must be provisioned securely via server-side execution.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/usersModel');
const { hashedPassword } = require('../utils/hash');

async function seedAdmin() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hustlehub';
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@hustlehub.test').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        console.error('[SeedAdmin] ADMIN_PASSWORD environment variable is required. Aborting.');
        process.exitCode = 1;
        return;
    }
    const adminName = process.env.ADMIN_NAME || 'System Administrator';

    console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:([^@]+)@/, ':****@')}`);
    await mongoose.connect(mongoUri);

    try {
        let admin = await User.findOne({ email: adminEmail });
        const passwordHash = await hashedPassword(adminPassword);

        if (admin) {
            admin.role = 'Admin';
            admin.passwordHash = passwordHash;
            admin.fullName = adminName;
            await admin.save();
            console.log(`[SeedAdmin] Existing admin user updated: ${adminEmail}`);
        } else {
            admin = await User.create({
                fullName: adminName,
                email: adminEmail,
                passwordHash,
                role: 'Admin'
            });
            console.log(`[SeedAdmin] Created new admin user: ${adminEmail} (Role: ${admin.role})`);
        }
    } catch (err) {
        console.error('[SeedAdmin] Failed to seed administrator account:', err.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log('[SeedAdmin] Disconnected from MongoDB.');
    }
}

if (require.main === module) {
    seedAdmin();
}

module.exports = seedAdmin;
