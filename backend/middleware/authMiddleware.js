const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "cluster_secret_key";

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded || typeof decoded !== 'object' || !decoded.id) {
      return res.status(401).json({ message: "Invalid token structure or payload" });
    }

    req.user = decoded; 
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ message });
  }
}

module.exports = authMiddleware;