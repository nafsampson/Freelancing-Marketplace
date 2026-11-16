const express = require('express');
const cors = require('cors');
const helmet = require('helmet');


const errorHandler = require('./Middleware/errorHandler');
const authRoutes = require('./Routes/authRoutes');

// Combined route imports from both branches
const adminRoutes = require('./Routes/adminRoutes');
const gigRoutes = require('./Routes/gigRoutes');
const bookingRoutes = require('./Routes/bookingRoutes');
const transactionRoutes = require('./Routes/transactionRoutes');

const sanitizeInput = require('./Middleware/sanitizeInput');

const logger = require('./utils/logger');
const requestLogger = require('./Middleware/requestLogger');



function createApp() {
    const app = express();

    const USE_HTTPS = process.env.USE_HTTPS === 'true';
    const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ||
    'http://localhost:5173';


    app.disable('x-powered-by');
    app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

    app.use(requestLogger);




    app.use(
        helmet({
            contentSecurityPolicy: {
                useDefaults: false,
                directives: {
                    defaultSrc: ["'none'"],
                    frameAncestors: ["'none'"],
                    baseUri: ["'none'"],
                    formAction: ["'none'"],
                    objectSrc: ["'none'"]
                }
            },
            hsts: USE_HTTPS ? {
                maxAge: 31536000,              // enforces HTTPS for one full year
                includeSubDomains: true,
                preload: true
            } : false,
            frameguard: { action: 'deny' },
            referrerPolicy: { policy: 'no-referrer' },
            crossOriginOpenerPolicy: { policy: 'same-origin' },
            crossOriginResourcePolicy: { policy: 'same-site' },
            noSniff: true
        })
    );

    app.use((req, res, next) => {

        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        res.setHeader('Cache-Control', 'no-store');
        next();
    });

    app.use(
        cors({
            origin: CLIENT_ORIGIN,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization']
        })
    );

    app.use(express.json({ limit: '10kb' }));
    app.use(sanitizeInput);

    app.get('/', (req, res) => {
        res.status(200).json({
            app: process.env.APP_NAME || 'HustleHub',
            message: 'HustleHub API is running'
        });
    });

    app.get('/health', (req, res) => {
        const ready = require('mongoose').connection.readyState === 1;
        res.status(ready ? 200 : 503).json({
            status: ready ? 'OK' : 'UNAVAILABLE',
            protocol: USE_HTTPS ? 'HTTPS' : 'HTTP'
        });
    });

    // Combined route middlewares from both branches
    app.use('/api/auth', authRoutes);
    app.use('/api/gigs', gigRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/bookings', bookingRoutes);
    app.use('/api/transactions', transactionRoutes);

    app.use((req, res) => {
        (req.log || logger).warn('route_not_found', {
            method: req.method,
            path: req.originalUrl.split('?')[0]
        });

        res.status(404).json({
            success: false,
            message: 'Route not found'
        });
    });

    app.use(errorHandler);


    return app;
}

module.exports = createApp;
