const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const HostelSettings = require('../models/HostelSettings');

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET || 'staysphere_secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Login user
exports.login = async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ message: 'Please provide userId and password' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated. Contact admin.' });
    }

    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user.userId, user.role);

    res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        hostelName: user.hostelName,
        authorityRole: user.authorityRole
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Admin Registration 
exports.registerAdmin = async (req, res) => {
  try {
    const { userId, password, name, email, phone, hostelName } = req.body;

    if (!hostelName) {
      return res.status(400).json({ message: 'Hostel Name is required for admin registration' });
    }

    // Check if an admin already exists
    const existingAdmin = await User.findOne({ role: 'admin', hostelName });
    if (existingAdmin) {
      return res.status(400).json({ message: `An admin already exists for hostel "${hostelName}". Only that admin can transfer the role.` });
    }

    const userExists = await User.findOne({ $or: [{ userId }, { email }] });
    if (userExists) {
      return res.status(400).json({ message: 'User with this ID or Email already exists' });
    }

    const user = await User.create({
      userId,
      password,
      name,
      email,
      phone,
      role: 'admin',
      hostelName
    });

    // default hostel settings
    await HostelSettings.create({
      hostelName,
      admin: user._id,
      locationCoordinates: { latitude: 0, longitude: 0 },
      returnRadius: 100,
      minMessCutDays: 3
    });

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      user: { userId: user.userId, role: user.role, hostelName }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server not responding', error: error.message });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'No user found with this User ID' });
    }

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (user.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ message: 'Email does not match this User ID' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
    const roleDisplayName = user.role.charAt(0).toUpperCase() + user.role.slice(1);

    const accountsHtml = `
      <div style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border-left: 4px solid #7C3AED; border-radius: 4px;">
        <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b;"><strong>Account Role:</strong> ${roleDisplayName}</p>
        <p style="margin: 0 0 15px 0; font-size: 14px; color: #64748b;"><strong>User ID:</strong> <span style="color: #0f172a;">${user.userId}</span></p>
        <a href="${resetUrl}" style="background-color: #7C3AED; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 14px;">Reset Password</a>
      </div>
    `;

    const accountsText = `Role: ${roleDisplayName}\nUser ID: ${user.userId}\nReset Link: ${resetUrl}\n\n`;

    const subject = 'StaySphere Password Reset Request';
    const message = `Hello ${user.name},

We received a request to reset the password for your StaySphere account.
Below is the reset link for your account. This link is valid for 10 minutes.

${accountsText}

If you did not request a password reset, you can safely ignore this email. Your account will remain unchanged.

Thank you,
StaySphere Support Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
        <h2 style="color: #7C3AED; border-bottom: 2px solid #7C3AED; padding-bottom: 10px;">StaySphere Password Reset</h2>
        <p>Hello ${user.name},</p>
        <p>We received a request to reset the password for the account associated with this email address.</p>
        <p>Please click the <strong>Reset Password</strong> button below to reset your password:</p>
        
        <div style="margin: 30px 0;">
          ${accountsHtml}
        </div>

        <p style="margin-top: 25px; font-size: 0.9em; color: #555;">
          For security reasons, this link will expire in <strong>10 minutes</strong>.
        </p>
        <p style="font-size: 0.9em; color: #555;">
          If you did not request a password reset, you can safely ignore this email. Your account will remain unchanged.
        </p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #888;">
          <p>Thank you,<br><strong>StaySphere Support Team</strong></p>
        </div>
      </div>
    `;

    try {
      const sendEmail = require('../utils/sendEmail');
      await sendEmail({
        email: email,
        subject: subject,
        message: message,
        html: html
      });

      res.json({
        success: true,
        message: 'Reset link sent to registered email'
      });
    } catch (err) {
      console.error('Email error:', err);
      // Clean up tokens on error
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server not responding', error: error.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Expired or invalid request' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server not responding', error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if away (Home Going or Outgoing)
    const HomeGoing = require('../models/HomeGoing');
    const Outgoing = require('../models/Outgoing');

    const isHomeGoing = await HomeGoing.exists({ student: user._id, isReturned: false, status: { $ne: 'cancelled' } });
    let isOutgoing = false;
    if (user.role === 'student') {
      isOutgoing = await Outgoing.exists({ student: user._id, isReturned: false });
    }

    const isActuallyAway = isHomeGoing || isOutgoing;

    res.json({ success: true, user: { ...user._doc, password: '', isAway: !!isActuallyAway } });
  } catch (error) {
    res.status(500).json({ message: 'Server not responding' });
  }
};
