
const MUTATION_METHODS = new Set([
    'POST',
    'PUT',
    'PATCH',
    'DELETE'
]);

const isDemoUser = (req) =>
    req.user?.isDemo === true || req.user?.is_demo === true;

const demoBlockMiddleware = (req, res, next) => {
    if (!isDemoUser(req)) {
        return next();
    }

    if (!MUTATION_METHODS.has(req.method.toUpperCase())) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Aksi tidak diizinkan. Akun demo berada dalam Mode Read-Only.'
    });
};

const demoAiBlockMiddleware = (req, res, next) => {
    if (!isDemoUser(req)) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Fitur AI Detection dan Quick Scan dinonaktifkan untuk akun demo.'
    });
};

module.exports = {
    demoBlockMiddleware,
    demoAiBlockMiddleware
};
