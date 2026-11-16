// Fictional screenshot data. Additive and restricted to the local demo database.
const mongoose = require('mongoose');
const { createHash } = require('node:crypto');
const User = require('../models/usersModel');
const Gig = require('../models/Gig');
const { hashedPassword } = require('../utils/hash');
const uri = 'mongodb://127.0.0.1:27018/hustlehub_demo?replicaSet=rs0';
const people = [
    ['amara', 'Amara Nkosi', 'Freelancer'],
    ['liam', 'Liam Jacobs', 'Freelancer'],
    ['zara', 'Zara Patel', 'Freelancer'],
    ['thabo', 'Thabo Molefe', 'Freelancer'],
    ['mia', 'Mia Daniels', 'Freelancer'],
    ['olivia', 'Olivia Reed', 'Client'],
    ['ethan', 'Ethan Brooks', 'Client']
];
const services = [
    ['amara', 'I will build a responsive business website', 'Web Development', 4500, ['React', 'CSS', 'Accessibility'], 'Launch a polished five-page website for your small business. Includes responsive layouts, accessible navigation, a contact form interface and a handover guide.'],
    ['amara', 'I will improve your website accessibility and performance', 'Web Development', 1800, ['HTML', 'Accessibility', 'Performance'], 'Review your existing website and improve keyboard navigation, colour contrast and page loading. Includes a concise report explaining the changes and remaining recommendations.'],
    ['liam', 'I will build an Android app prototype for your idea', 'Mobile App Development', 6500, ['Kotlin', 'Android', 'Material Design'], 'Turn your app idea into a working Android prototype with up to four screens. Includes navigation, form validation and testing on a physical Android device.'],
    ['liam', 'I will fix bugs in your Android application', 'Mobile App Development', 2200, ['Kotlin', 'Debugging', 'Android'], 'Investigate and resolve up to three reproducible Android application bugs. Includes clear reproduction steps, a summary of each fix and a short testing checklist.'],
    ['zara', 'I will design a clear and modern app experience', 'UI/UX Design', 3200, ['Figma', 'Prototyping', 'User Flows'], 'Create wireframes and a clickable prototype for your main user journey. Includes five screen designs, consistent components and one revision based on your feedback.'],
    ['zara', 'I will create a distinctive visual identity for your brand', 'Graphic Design', 1500, ['Branding', 'Typography', 'Logo Design'], 'Develop a cohesive starter identity for your business, including a logo concept, colour palette and typography recommendations. Includes export files and a simple usage guide.'],
    ['thabo', 'I will turn your spreadsheet data into a useful dashboard', 'Data & Analytics', 2800, ['Excel', 'Power BI', 'Data Cleaning'], 'Clean and organise your supplied spreadsheet data, then build a dashboard highlighting your key metrics. Includes clear chart labels and a guide for refreshing the data.'],
    ['thabo', 'I will automate a repetitive reporting task with Python', 'Data & Analytics', 3500, ['Python', 'CSV', 'Automation'], 'Automate a well-defined reporting task using your sample files. Includes input validation, readable Python code, setup instructions and an example output report.'],
    ['mia', 'I will write clear website copy for your small business', 'Writing & Translation', 950, ['Copywriting', 'Editing', 'Content'], 'Write concise, original copy for your home, about and services pages. Includes a discovery questionnaire, a consistent tone of voice and one round of revisions.'],
    ['mia', 'I will plan a month of social media content for your brand', 'Digital Marketing', 1600, ['Content Strategy', 'Social Media', 'Copywriting'], 'Create a practical four-week content calendar tailored to your audience. Includes twelve post concepts, draft captions and suggestions for visuals you can produce yourself.']
];
function demoId(key) {
    return new mongoose.Types.ObjectId(createHash('sha256').update(`hustlehub-demo-v1:${key}`).digest('hex').slice(0, 24));
}
async function seed() {
    const password = process.env.DEMO_PASSWORD;
    if (!password || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
        throw new Error('Set DEMO_PASSWORD to a password of at least 12 characters and at most 72 UTF-8 bytes.');
    }
    const passwordHash = await hashedPassword(password);
    const users = people.map(([key, fullName, role]) => ({ _id: demoId(`user:${key}`), fullName, role, email: `${key}@demo.hustlehub.test`, passwordHash }));
    const gigs = services.map(([owner, title, category, price, skills, description], index) => ({ _id: demoId(`gig:${index}`), freelancerId: demoId(`user:${owner}`), title, category, price, skills, description }));
    // Validate every fixture before connecting or changing any data.
    for (const data of users) await new User(data).validate();
    for (const data of gigs) await new Gig(data).validate();
    if (process.argv.includes('--validate-only')) {
        console.log(`Validated ${users.length} fictional users and ${gigs.length} gigs. No database connection made.`);
        return;
    }
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    try {
        const result = await mongoose.connection.transaction(async session => {
            let addedUsers = 0;
            let addedGigs = 0;
            for (const data of users) {
                const existing = await User.findOne({ $or: [{ _id: data._id }, { email: data.email }] }).session(session);
                if (existing) {
                    if (!existing._id.equals(data._id) || existing.email !== data.email || existing.role !== data.role) {
                        throw new Error(`Account collision for ${data.email}; no changes committed.`);
                    }
                    continue; // Preserve existing passwords, names and account state.
                }
                await User.create([data], { session });
                addedUsers++;
            }
            for (const data of gigs) {
                const existing = await Gig.findById(data._id).session(session);
                if (existing) {
                    if (!existing.freelancerId.equals(data.freelancerId)) throw new Error('Demo gig ownership collision; no changes committed.');
                    continue; // Preserve any edits made after the initial seed.
                }
                await Gig.create([data], { session });
                addedGigs++;
            }
            return { addedUsers, addedGigs };
        });
        console.log(`Local demo seed complete: ${result.addedUsers} users and ${result.addedGigs} gigs added.`);
        console.log('Existing users, gigs and bookings were preserved. No financial transactions were created.');
        console.log('Demo emails: ' + users.map(user => user.email).join(', '));
    } finally {
        await mongoose.disconnect();
    }
}
seed().catch(error => { console.error('Demo seed failed:', error.message); process.exitCode = 1; });
