const User = require('../models/User');

const seedAdmin = async () => {
  console.log('seedAdmin');
  
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        name: 'System Admin',
        email: process.env.ADMIN_EMAIL || 'admin@portal.com',
        password: 'Admin@123',
        role: 'admin'
      });
      console.log('✅ Default admin created:');
      console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@portal.com'}`);
      console.log('   Password: Admin@123');
      console.log('   ⚠️  Please change this password immediately!');
    }
  } catch (error) {
    console.error('Error seeding admin:', error.message);
  }
};

module.exports = seedAdmin;
