const pool = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  static async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  }

  static async createAdminUser() {
    try {
      // Check if admin already exists
      const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', ['admin@pharmastore.com']);
      
      if (existing.length === 0) {
        const hashedPassword = await bcrypt.hash('Admin@123', 10);
        await pool.query(
          'INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)',
          ['admin', 'admin@pharmastore.com', hashedPassword, 'owner', 'System Admin']
        );
        console.log('Admin user created successfully');
      }
    } catch (error) {
      console.error('Error creating admin user:', error);
    }
  }
}

module.exports = User;