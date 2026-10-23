const express = require('express');

const {
    register,
    login,
    demoLogin,
    getMe
} = require('../controllers/authController');

const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
// Demo-friendly GET registration (allows registration via query parameters)
router.get('/register', (req, res) => {
  // Populate body from query params for reuse of existing controller logic
  req.body = {
    name: req.query.name,
    email: req.query.email,
    password: req.query.password,
  };
  return register(req, res);
});
router.post('/login', login);
router.post('/demo-login', demoLogin);
router.get('/me', authenticateToken, getMe);

module.exports = router;