const fs = require('fs');

const collection = {
  info: {
    _postman_id: "c8e6a71f-0b32-421b-a5d6-847291a92e10",
    name: "HustleHub Marketplace API",
    description: "Automated end-to-end integration and security test collection for HustleHub+. Validates authentication, RBAC, gig lifecycle, booking transactions, income tracking, admin privileges, security headers, and rate limiting.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  variable: [
    { key: "baseUrl", value: "https://localhost:4000", type: "string" },
    { key: "clientToken", value: "", type: "string" },
    { key: "freelancerToken", value: "", type: "string" },
    { key: "freelancerBToken", value: "", type: "string" },
    { key: "adminToken", value: "", type: "string" },
    { key: "createdGigId", value: "", type: "string" },
    { key: "createdBookingId", value: "", type: "string" },
    { key: "runId", value: "", type: "string" },
    { key: "clientEmail", value: "", type: "string" },
    { key: "freelancerAEmail", value: "", type: "string" },
    { key: "freelancerBEmail", value: "", type: "string" },
    { key: "adminEmail", value: "", type: "string" },
    { key: "adminPassword", value: "", type: "string" },
    { key: "rateLimitEmail", value: "", type: "string" }
  ],
  event: [
    {
      listen: "prerequest",
      script: {
        type: "text/javascript",
        exec: [
          "if (!pm.collectionVariables.get('runId')) {",
          "    const id = Date.now().toString();",
          "    pm.collectionVariables.set('runId', id);",
          "    pm.collectionVariables.set('clientEmail', 'client_' + id + '@hustlehub.test');",
          "    pm.collectionVariables.set('freelancerAEmail', 'freelancerA_' + id + '@hustlehub.test');",
          "    pm.collectionVariables.set('freelancerBEmail', 'freelancerB_' + id + '@hustlehub.test');",
          "    pm.collectionVariables.set('rateLimitEmail', 'ratelimit_' + id + '@hustlehub.test');",
          "    if (!pm.collectionVariables.get('adminEmail')) {",
          "        pm.collectionVariables.set('adminEmail', 'admin@hustlehub.test');",
          "    }",
          "    if (!pm.collectionVariables.get('adminPassword')) {",
          "        pm.collectionVariables.set('adminPassword', 'AdminPassword123!');",
          "    }",
          "}"
        ]
      }
    },
    {
      listen: "test",
      script: {
        type: "text/javascript",
        exec: [
          "// Collection-level Security Header Assertions (enforced on every request)",
          "pm.test('Security Header: X-Content-Type-Options is nosniff', function () {",
          "    pm.response.to.have.header('X-Content-Type-Options', 'nosniff');",
          "});",
          "pm.test('Security Header: X-Frame-Options is DENY', function () {",
          "    pm.response.to.have.header('X-Frame-Options', 'DENY');",
          "});",
          "pm.test('Security Header: Content-Security-Policy is present', function () {",
          "    pm.response.to.have.header('Content-Security-Policy');",
          "});",
          "pm.test('Security Header: X-Powered-By is disabled', function () {",
          "    pm.expect(pm.response.headers.has('X-Powered-By')).to.be.false;",
          "});",
          "pm.test('Security Header: Cross-Origin-Resource-Policy is present', function () {",
          "    pm.response.to.have.header('Cross-Origin-Resource-Policy');",
          "});"
        ]
      }
    }
  ],
  item: [
    {
      name: "1. User Registration & Input Validation",
      item: [
        {
          name: "Register - Valid Client User",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Alice Client",
                email: "{{clientEmail}}",
                password: "ClientPassword123!",
                role: "Client"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/register", host: ["{{baseUrl}}"], path: ["api", "auth", "register"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Register Client returns 201 Created', function () {",
                "    pm.response.to.have.status(201);",
                "});",
                "pm.test('Register Client returns success true and Client role', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.true;",
                "    pm.expect(json.data.role).to.eql('Client');",
                "    pm.expect(json.data.id).to.exist;",
                "});"
              ]
            }
          }]
        },
        {
          name: "Register - Duplicate Email Rejection",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Duplicate User",
                email: "{{clientEmail}}",
                password: "ClientPassword123!",
                role: "Client"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/register", host: ["{{baseUrl}}"], path: ["api", "auth", "register"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Duplicate email returns 409 Conflict', function () {",
                "    pm.response.to.have.status(409);",
                "});",
                "pm.test('Duplicate email returns user already exists message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('User already exists');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Register - Valid Freelancer A",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Bob Freelancer",
                email: "{{freelancerAEmail}}",
                password: "FreelancerPassword123!",
                role: "Freelancer"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/register", host: ["{{baseUrl}}"], path: ["api", "auth", "register"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Register Freelancer A returns 201 Created', function () {",
                "    pm.response.to.have.status(201);",
                "});",
                "pm.test('Register Freelancer A returns Freelancer role', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.true;",
                "    pm.expect(json.data.role).to.eql('Freelancer');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Register - Valid Freelancer B",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Charlie Freelancer",
                email: "{{freelancerBEmail}}",
                password: "FreelancerBPassword123!",
                role: "Freelancer"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/register", host: ["{{baseUrl}}"], path: ["api", "auth", "register"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Register Freelancer B returns 201 Created', function () {",
                "    pm.response.to.have.status(201);",
                "});",
                "pm.test('Register Freelancer B returns Freelancer role', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.true;",
                "    pm.expect(json.data.role).to.eql('Freelancer');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Register - Admin Self-Registration Rejected (Privilege Escalation Protection)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Malicious Self-Registered Admin",
                email: "evil_admin@example.com",
                password: "AdminPassword123!",
                role: "Admin"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/register", host: ["{{baseUrl}}"], path: ["api", "auth", "register"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Admin self-registration is rejected with 400 Bad Request', function () {",
                "    pm.response.to.have.status(400);",
                "});",
                "pm.test('Returns valid role error message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('valid role');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Register - Missing Field (Password Missing)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Incomplete User",
                email: "incomplete@example.com",
                role: "Client"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/register", host: ["{{baseUrl}}"], path: ["api", "auth", "register"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Missing field returns 400 Bad Request', function () {",
                "    pm.response.to.have.status(400);",
                "});",
                "pm.test('Returns appropriate required error message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('required');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Register - Wrong Data Type (Numeric Name)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: 998877,
                email: "numericname@example.com",
                password: "Password123!",
                role: "Client"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/register", host: ["{{baseUrl}}"], path: ["api", "auth", "register"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Wrong data type returns 400 Bad Request', function () {",
                "    pm.response.to.have.status(400);",
                "});",
                "pm.test('Returns text values error message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('text values');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Register - Invalid Email Format",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Bad Email",
                email: "not-an-email-format",
                password: "Password123!",
                role: "Client"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/register", host: ["{{baseUrl}}"], path: ["api", "auth", "register"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Invalid email returns 400 Bad Request', function () {",
                "    pm.response.to.have.status(400);",
                "});",
                "pm.test('Returns valid email address error message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('valid email address');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Register - Short Password (<8 chars)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Short Pass",
                email: "shortpass@example.com",
                password: "short",
                role: "Client"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/register", host: ["{{baseUrl}}"], path: ["api", "auth", "register"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Short password returns 400 Bad Request', function () {",
                "    pm.response.to.have.status(400);",
                "});",
                "pm.test('Returns password length error message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('at least 8 characters');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Register - Invalid Role",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Invalid Role User",
                email: "invalidrole@example.com",
                password: "Password123!",
                role: "Footballer"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/register", host: ["{{baseUrl}}"], path: ["api", "auth", "register"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Invalid role returns 400 Bad Request', function () {",
                "    pm.response.to.have.status(400);",
                "});",
                "pm.test('Returns valid role error message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('valid role');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Register - XSS Angle Brackets Protection",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "<script>alert(1)</script>",
                email: "xss@example.com",
                password: "Password123!",
                role: "Client"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/register", host: ["{{baseUrl}}"], path: ["api", "auth", "register"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('XSS script tag in name returns 400 Bad Request', function () {",
                "    pm.response.to.have.status(400);",
                "});",
                "pm.test('Returns sanitisation protection error', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('< or >');",
                "});"
              ]
            }
          }]
        }
      ]
    },
    {
      name: "2. Authentication & Token Harvesting",
      item: [
        {
          name: "Login - Freelancer A Success",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "{{freelancerAEmail}}",
                password: "FreelancerPassword123!"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Login Freelancer A returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "const json = pm.response.json();",
                "pm.test('Saves valid JWT freelancerToken', function () {",
                "    pm.expect(json.token).to.be.a('string');",
                "    pm.collectionVariables.set('freelancerToken', json.token);",
                "    pm.expect(json.user.role).to.eql('Freelancer');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Login - Freelancer B Success",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "{{freelancerBEmail}}",
                password: "FreelancerBPassword123!"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Login Freelancer B returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "const json = pm.response.json();",
                "pm.test('Saves valid JWT freelancerBToken', function () {",
                "    pm.expect(json.token).to.be.a('string');",
                "    pm.collectionVariables.set('freelancerBToken', json.token);",
                "    pm.expect(json.user.role).to.eql('Freelancer');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Login - Client Success",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "{{clientEmail}}",
                password: "ClientPassword123!"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Login Client returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "const json = pm.response.json();",
                "pm.test('Saves valid JWT clientToken', function () {",
                "    pm.expect(json.token).to.be.a('string');",
                "    pm.collectionVariables.set('clientToken', json.token);",
                "    pm.expect(json.user.role).to.eql('Client');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Login - Admin Success",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "{{adminEmail}}",
                password: "{{adminPassword}}"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Login Admin returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "const json = pm.response.json();",
                "pm.test('Saves valid JWT adminToken with Admin role', function () {",
                "    pm.expect(json.token).to.be.a('string');",
                "    pm.collectionVariables.set('adminToken', json.token);",
                "    pm.expect(json.user.role).to.eql('Admin');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Login - Wrong Password Rejection",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "{{clientEmail}}",
                password: "WrongPassword999!"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Wrong password returns 401 Unauthorized', function () {",
                "    pm.response.to.have.status(401);",
                "});",
                "pm.test('Returns Invalid credentials message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('Invalid credentials');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Login - Unregistered Email Rejection",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "nonexistent_user_9999@example.com",
                password: "Password123!"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Unregistered email returns 401 Unauthorized', function () {",
                "    pm.response.to.have.status(401);",
                "});",
                "pm.test('Returns Invalid credentials message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('Invalid credentials');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Login - Missing Password Rejection",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "{{clientEmail}}"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Missing password returns 400 Bad Request', function () {",
                "    pm.response.to.have.status(400);",
                "});",
                "pm.test('Returns password required message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('required');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Login - NoSQL Injection Payload Blocked",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: { "$gt": "" },
                password: { "$gt": "" }
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('NoSQL injection object payload is rejected with 400 Bad Request', function () {",
                "    pm.response.to.have.status(400);",
                "});",
                "pm.test('Returns type safety validation error', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('text values');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Login - Malformed JSON Payload Handled Gracefully",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: "{\"email\": \"broken_json_payload"
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Malformed JSON syntax returns 400 Bad Request', function () {",
                "    pm.response.to.have.status(400);",
                "});",
                "pm.test('Returns clear JSON parse error without leaking stack traces', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('Invalid JSON in request body');",
                "});"
              ]
            }
          }]
        }
      ]
    },
    {
      name: "3. Profile & JWT Guard Verification",
      item: [
        {
          name: "Profile - Access with Valid Bearer Token",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{clientToken}}" }],
            url: { raw: "{{baseUrl}}/api/auth/profile", host: ["{{baseUrl}}"], path: ["api", "auth", "profile"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Valid token returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "pm.test('Returns correct authenticated user profile data', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.true;",
                "    pm.expect(json.data.email).to.eql(pm.collectionVariables.get('clientEmail'));",
                "    pm.expect(json.data.role).to.eql('Client');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Profile - Missing Authorization Header Rejection",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/auth/profile", host: ["{{baseUrl}}"], path: ["api", "auth", "profile"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Missing token returns 401 Unauthorized', function () {",
                "    pm.response.to.have.status(401);",
                "});",
                "pm.test('Returns No token provided message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('No token provided');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Profile - Invalid / Tampered Token Rejection",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer invalid_tampered_jwt_token_123" }],
            url: { raw: "{{baseUrl}}/api/auth/profile", host: ["{{baseUrl}}"], path: ["api", "auth", "profile"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Invalid token returns 401 Unauthorized', function () {",
                "    pm.response.to.have.status(401);",
                "});",
                "pm.test('Returns Invalid or expired token message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('Invalid or expired token');",
                "});"
              ]
            }
          }]
        }
      ]
    },
    {
      name: "4. Gigs Management & RBAC Enforcement",
      item: [
        {
          name: "Gigs - Public Browse (Unauthenticated)",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/gigs", host: ["{{baseUrl}}"], path: ["api", "gigs"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Public browse returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "pm.test('Returns array of gigs', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.true;",
                "    pm.expect(Array.isArray(json.data)).to.be.true;",
                "});"
              ]
            }
          }]
        },
        {
          name: "Gigs - Freelancer A Creates Valid Gig",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{freelancerToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                title: "Cloud Infrastructure & Docker Deployment",
                description: "Professional AWS/GCP and Docker container orchestration setup with CI/CD automation pipeline.",
                category: "Web Development",
                price: 350,
                skills: ["Docker", "Node.js", "CI/CD"]
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/gigs", host: ["{{baseUrl}}"], path: ["api", "gigs"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Freelancer creating gig returns 201 Created', function () {",
                "    pm.response.to.have.status(201);",
                "});",
                "const json = pm.response.json();",
                "pm.test('Returns created gig with generated ID and sets createdGigId', function () {",
                "    pm.expect(json.success).to.be.true;",
                "    pm.expect(json.data.id).to.exist;",
                "    pm.expect(json.data.price).to.eql(350);",
                "    pm.collectionVariables.set('createdGigId', json.data.id);",
                "});"
              ]
            }
          }]
        },
        {
          name: "Gigs - Client Blocked from Creating Gig (RBAC 403)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{clientToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                title: "Client Trying to Create Gig",
                description: "This request should be denied because Clients cannot publish gigs.",
                category: "Web Development",
                price: 200
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/gigs", host: ["{{baseUrl}}"], path: ["api", "gigs"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Client creating gig returns 403 Forbidden', function () {",
                "    pm.response.to.have.status(403);",
                "});",
                "pm.test('Returns Access denied message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('Access denied');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Gigs - Unauthenticated Creation Blocked (401)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                title: "Anonymous Gig Attempt",
                description: "Cannot create gig without a valid authentication bearer token.",
                category: "Web Development",
                price: 150
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/gigs", host: ["{{baseUrl}}"], path: ["api", "gigs"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Unauthenticated gig creation returns 401 Unauthorized', function () {",
                "    pm.response.to.have.status(401);",
                "});"
              ]
            }
          }]
        },
        {
          name: "Gigs - Validation Fails for Short Title (400)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{freelancerToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                title: "Dev",
                description: "A very detailed description of web development service that satisfies length.",
                category: "Web Development",
                price: 100
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/gigs", host: ["{{baseUrl}}"], path: ["api", "gigs"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Short title returns 400 Bad Request', function () {",
                "    pm.response.to.have.status(400);",
                "});",
                "pm.test('Returns title length error message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('between 5 and 100');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Gigs - Validation Fails for Non-Whitelisted Category (400)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{freelancerToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                title: "Custom Welding and Steel Fabrication",
                description: "Heavy metal fabrication services for industrial equipment and structural framing.",
                category: "Blacksmithing",
                price: 800
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/gigs", host: ["{{baseUrl}}"], path: ["api", "gigs"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Invalid category returns 400 Bad Request', function () {",
                "    pm.response.to.have.status(400);",
                "});",
                "pm.test('Returns category whitelist error message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('Category must be one of');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Gigs - Get Gig By Valid ID",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/gigs/{{createdGigId}}", host: ["{{baseUrl}}"], path: ["api", "gigs", "{{createdGigId}}"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Get gig by ID returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "pm.test('Returns matching gig details', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.true;",
                "    pm.expect(json.data.id).to.eql(pm.collectionVariables.get('createdGigId'));",
                "});"
              ]
            }
          }]
        },
        {
          name: "Gigs - Get Non-Existent Gig Returns 404",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/gigs/64b0f1a23c4d5e6f7a8b9c01", host: ["{{baseUrl}}"], path: ["api", "gigs", "64b0f1a23c4d5e6f7a8b9c01"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Non-existent gig returns 404 Not Found', function () {",
                "    pm.response.to.have.status(404);",
                "});",
                "pm.test('Returns Gig not found message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('Gig not found');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Gigs - Get Gig By Invalid ObjectId (400)",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/gigs/invalid-mongo-id", host: ["{{baseUrl}}"], path: ["api", "gigs", "invalid-mongo-id"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Invalid ObjectId returns 400 Bad Request', function () {",
                "    pm.response.to.have.status(400);",
                "});",
                "pm.test('Returns ID format error message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('Incorrect gig ID format');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Gigs - Client Blocked from Editing Gig (RBAC 403)",
          request: {
            method: "PUT",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{clientToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                title: "Client Trying to Edit Gig Title",
                description: "Clients have no privileges to modify gig service listings.",
                category: "Web Development",
                price: 999
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/gigs/{{createdGigId}}", host: ["{{baseUrl}}"], path: ["api", "gigs", "{{createdGigId}}"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Client editing gig returns 403 Forbidden', function () {",
                "    pm.response.to.have.status(403);",
                "});",
                "pm.test('Returns Access denied message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('Access denied');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Gigs - Freelancer B Blocked from Editing Freelancer A's Gig (Ownership 403)",
          request: {
            method: "PUT",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{freelancerBToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                title: "Unauthorized Takeover of Freelancer A Gig",
                description: "Freelancer B maliciously attempts to modify Freelancer A's gig details.",
                category: "Web Development",
                price: 999
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/gigs/{{createdGigId}}", host: ["{{baseUrl}}"], path: ["api", "gigs", "{{createdGigId}}"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Non-owner editing gig returns 403 Forbidden', function () {",
                "    pm.response.to.have.status(403);",
                "});",
                "pm.test('Returns ownership authorization error', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('You are not authorized to update this gig');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Gigs - Freelancer B Blocked from Deleting Freelancer A's Gig (Ownership 403)",
          request: {
            method: "DELETE",
            header: [{ key: "Authorization", value: "Bearer {{freelancerBToken}}" }],
            url: { raw: "{{baseUrl}}/api/gigs/{{createdGigId}}", host: ["{{baseUrl}}"], path: ["api", "gigs", "{{createdGigId}}"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Non-owner deleting gig returns 403 Forbidden', function () {",
                "    pm.response.to.have.status(403);",
                "});",
                "pm.test('Returns deletion authorization error', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('You are not authorized to delete this gig');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Gigs - Freelancer A Successfully Edits Own Gig",
          request: {
            method: "PUT",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{freelancerToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                title: "Cloud Infrastructure & Docker Deployment Updated",
                description: "Professional AWS/GCP and Docker container orchestration setup with CI/CD automation pipeline.",
                category: "Web Development",
                price: 400
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/gigs/{{createdGigId}}", host: ["{{baseUrl}}"], path: ["api", "gigs", "{{createdGigId}}"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Owner updating gig returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "pm.test('Returns updated title and price', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.true;",
                "    pm.expect(json.data.title).to.include('Updated');",
                "    pm.expect(json.data.price).to.eql(400);",
                "});"
              ]
            }
          }]
        }
      ]
    },
    {
      name: "5. Booking & Financial Transaction Lifecycle",
      item: [
        {
          name: "Bookings - Unauthenticated Request Blocked (401)",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/bookings", host: ["{{baseUrl}}"], path: ["api", "bookings"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Unauthenticated bookings query returns 401 Unauthorized', function () {",
                "    pm.response.to.have.status(401);",
                "});",
                "pm.test('Returns No token provided error', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('No token provided');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Bookings - Client Books Freelancer A's Gig",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{clientToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                gigId: "{{createdGigId}}"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/bookings", host: ["{{baseUrl}}"], path: ["api", "bookings"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Client creating booking returns 201 Created', function () {",
                "    pm.response.to.have.status(201);",
                "});",
                "const json = pm.response.json();",
                "pm.test('Creates booking and linked transaction record', function () {",
                "    pm.expect(json.message).to.eql('Booking created');",
                "    pm.expect(json.data.booking._id).to.exist;",
                "    pm.expect(json.data.transaction._id).to.exist;",
                "    pm.expect(json.data.transaction.amount).to.eql(400);",
                "    pm.collectionVariables.set('createdBookingId', json.data.booking._id);",
                "});"
              ]
            }
          }]
        },
        {
          name: "Bookings - Freelancer Blocked from Creating Booking (RBAC 403)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{freelancerToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                gigId: "{{createdGigId}}"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/bookings", host: ["{{baseUrl}}"], path: ["api", "bookings"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Freelancer creating booking returns 403 Forbidden', function () {",
                "    pm.response.to.have.status(403);",
                "});",
                "pm.test('Returns Access denied message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('Access denied');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Bookings - Missing gigId Rejection (400)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{clientToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({}, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/bookings", host: ["{{baseUrl}}"], path: ["api", "bookings"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Missing gigId returns 400 Bad Request', function () {",
                "    pm.response.to.have.status(400);",
                "});",
                "pm.test('Returns gigId is required error', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.error).to.eql('gigId is required');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Bookings - Client Views Their Own Bookings",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{clientToken}}" }],
            url: { raw: "{{baseUrl}}/api/bookings", host: ["{{baseUrl}}"], path: ["api", "bookings"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Client viewing bookings returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "pm.test('Returns bookings list with count >= 1', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.count).to.be.at.least(1);",
                "    pm.expect(Array.isArray(json.data)).to.be.true;",
                "});"
              ]
            }
          }]
        },
        {
          name: "Bookings - Freelancer A Views Their Received Bookings",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{freelancerToken}}" }],
            url: { raw: "{{baseUrl}}/api/bookings", host: ["{{baseUrl}}"], path: ["api", "bookings"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Freelancer viewing bookings returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "pm.test('Returns received bookings', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.count).to.be.at.least(1);",
                "});"
              ]
            }
          }]
        },
        {
          name: "Bookings - Get Specific Booking By ID",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{clientToken}}" }],
            url: { raw: "{{baseUrl}}/api/bookings/{{createdBookingId}}", host: ["{{baseUrl}}"], path: ["api", "bookings", "{{createdBookingId}}"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Get booking by ID returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "pm.test('Returns specific booking data', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.data._id).to.eql(pm.collectionVariables.get('createdBookingId'));",
                "});"
              ]
            }
          }]
        },
        {
          name: "Bookings - Freelancer B Blocked from Viewing Freelancer A's Booking (404 / Unauthorized)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{freelancerBToken}}" }],
            url: { raw: "{{baseUrl}}/api/bookings/{{createdBookingId}}", host: ["{{baseUrl}}"], path: ["api", "bookings", "{{createdBookingId}}"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Unauthorized user reading another booking returns 404', function () {",
                "    pm.response.to.have.status(404);",
                "});",
                "pm.test('Returns Booking not found security error', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.error).to.eql('Booking not found');",
                "});"
              ]
            }
          }]
        }
      ]
    },
    {
      name: "6. Income Tracking & Financial Access Control",
      item: [
        {
          name: "Transactions - Unauthenticated Income Request Blocked (401)",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/transactions/income", host: ["{{baseUrl}}"], path: ["api", "transactions", "income"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Unauthenticated income request returns 401 Unauthorized', function () {",
                "    pm.response.to.have.status(401);",
                "});",
                "pm.test('Returns No token provided message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('No token provided');",
                "});"
              ]
            }
          }]
        },
        {
          name: "Transactions - Freelancer A Reads Exact Earned Income (200)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{freelancerToken}}" }],
            url: { raw: "{{baseUrl}}/api/transactions/income", host: ["{{baseUrl}}"], path: ["api", "transactions", "income"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Freelancer A reading income returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "pm.test('Verified income reflects exact booked transaction of 400', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.data.totalIncome).to.eql(400);",
                "    pm.expect(json.data.transactionCount).to.eql(1);",
                "    pm.expect(Array.isArray(json.data.transactions)).to.be.true;",
                "});"
              ]
            }
          }]
        },
        {
          name: "Transactions - Freelancer B Reads Income with Zero Transactions (Isolation Check)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{freelancerBToken}}" }],
            url: { raw: "{{baseUrl}}/api/transactions/income", host: ["{{baseUrl}}"], path: ["api", "transactions", "income"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Freelancer B reading income returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "pm.test('Isolated calculation returns exactly 0 for unbooked freelancer', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.data.totalIncome).to.eql(0);",
                "    pm.expect(json.data.transactionCount).to.eql(0);",
                "});"
              ]
            }
          }]
        },
        {
          name: "Transactions - Client Blocked from Accessing Income (RBAC 403)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{clientToken}}" }],
            url: { raw: "{{baseUrl}}/api/transactions/income", host: ["{{baseUrl}}"], path: ["api", "transactions", "income"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Client accessing income returns 403 Forbidden', function () {",
                "    pm.response.to.have.status(403);",
                "});",
                "pm.test('Returns Access denied message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.eql('Access denied');",
                "});"
              ]
            }
          }]
        }
      ]
    },
    {
      name: "7. Admin Oversight & Platform Metrics",
      item: [
        {
          name: "Admin - Client Blocked from Platform Stats (RBAC 403)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{clientToken}}" }],
            url: { raw: "{{baseUrl}}/api/admin/stats", host: ["{{baseUrl}}"], path: ["api", "admin", "stats"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Client accessing admin stats returns 403 Forbidden', function () {",
                "    pm.response.to.have.status(403);",
                "});"
              ]
            }
          }]
        },
        {
          name: "Admin - Freelancer Blocked from Platform Stats (RBAC 403)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{freelancerToken}}" }],
            url: { raw: "{{baseUrl}}/api/admin/stats", host: ["{{baseUrl}}"], path: ["api", "admin", "stats"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Freelancer accessing admin stats returns 403 Forbidden', function () {",
                "    pm.response.to.have.status(403);",
                "});"
              ]
            }
          }]
        },
        {
          name: "Admin - Admin Successfully Reads Platform Stats",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{adminToken}}" }],
            url: { raw: "{{baseUrl}}/api/admin/stats", host: ["{{baseUrl}}"], path: ["api", "admin", "stats"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Admin accessing stats returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "pm.test('Returns platform counters', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.true;",
                "    pm.expect(json.data.totalUsers).to.be.at.least(1);",
                "    pm.expect(json.data.totalGigs).to.be.at.least(1);",
                "    pm.expect(json.data.totalBookings).to.be.at.least(1);",
                "});"
              ]
            }
          }]
        },
        {
          name: "Admin - Admin Reads All Users Summary",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{adminToken}}" }],
            url: { raw: "{{baseUrl}}/api/admin/users", host: ["{{baseUrl}}"], path: ["api", "admin", "users"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Admin reading users returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "pm.test('Returns formatted user management list', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.true;",
                "    pm.expect(Array.isArray(json.data)).to.be.true;",
                "});"
              ]
            }
          }]
        },
        {
          name: "Admin - Admin Reads All Platform Gigs",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{adminToken}}" }],
            url: { raw: "{{baseUrl}}/api/admin/gigs", host: ["{{baseUrl}}"], path: ["api", "admin", "gigs"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Admin reading gigs returns 200 OK', function () {",
                "    pm.response.to.have.status(200);",
                "});",
                "pm.test('Returns moderation gigs list', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.true;",
                "    pm.expect(Array.isArray(json.data)).to.be.true;",
                "});"
              ]
            }
          }]
        }
      ]
    },
    {
      // NOTE: loginLimiter allows max 7 failed attempts per IP window. Earlier test folders
      // (Wrong Password, Unregistered Email, Missing Password, NoSQL Injection) consume 4.
      // This section sends 3 more (reaching the limit of 7), then the 4th triggers 429.
      name: "8. Rate Limiting Brute Force Protection Loop",
      item: [
        {
          name: "RateLimit Loop - Failed Login Attempt 1 (401)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ email: "{{rateLimitEmail}}", password: "BadPassword1" }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Attempt 1 returns 401 Unauthorized', function () {",
                "    pm.response.to.have.status(401);",
                "});"
              ]
            }
          }]
        },
        {
          name: "RateLimit Loop - Failed Login Attempt 2 (401)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ email: "{{rateLimitEmail}}", password: "BadPassword2" }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Attempt 2 returns 401 Unauthorized', function () {",
                "    pm.response.to.have.status(401);",
                "});"
              ]
            }
          }]
        },
        {
          name: "RateLimit Loop - Failed Login Attempt 3 (401)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ email: "{{rateLimitEmail}}", password: "BadPassword3" }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Attempt 3 returns 401 Unauthorized', function () {",
                "    pm.response.to.have.status(401);",
                "});"
              ]
            }
          }]
        },
        {
          name: "RateLimit Loop - Exceeded Threshold Triggers 429 Too Many Requests",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ email: "{{rateLimitEmail}}", password: "BadPassword4" }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "pm.test('Exceeded threshold triggers 429 Too Many Requests', function () {",
                "    pm.response.to.have.status(429);",
                "});",
                "pm.test('Returns rate limit exceeded message', function () {",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('Too many failed login attempts');",
                "});"
              ]
            }
          }]
        }
      ]
    }
  ]
};

const filePath = 'PostmanCollectionTests/marketplace-api.postman_collection.json';
fs.writeFileSync(filePath, JSON.stringify(collection, null, 2));
console.log('Comprehensive collection successfully written to ' + filePath);
