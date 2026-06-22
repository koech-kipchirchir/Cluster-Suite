# Security Guidelines

- Rotate secrets regularly (JWT_SECRET, API keys).
- Do not commit secrets to repo. Use environment variables.
- Limit rate for AI endpoints to prevent abuse (e.g., express-rate-limit).
- Use HTTPS in production and secure cookies for tokens.
- Validate and sanitize user input for SQL/command injection.
- Keep dependencies up to date and monitor with Dependabot.
