const http = require('http');
const app = require('../app');
const pool = require('../config/database');

async function runTests() {
    console.log('--- STARTING BACKEND DEMO MODE VERIFICATION TESTS ---');

    // Jalankan server lokal untuk testing
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api`;

    let passedTests = 0;
    let failedTests = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`[PASS] ${message}`);
            passedTests++;
        } else {
            console.error(`[FAIL] ${message}`);
            failedTests++;
        }
    }

    async function request(endpoint, options = {}) {
        const url = `${baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const fetchOptions = {
            method: options.method || 'GET',
            headers
        };

        if (options.body) {
            fetchOptions.body = JSON.stringify(options.body);
        }

        const res = await fetch(url, fetchOptions);
        let data = null;
        try {
            data = await res.json();
        } catch (e) {
            // non-json
        }

        return { status: res.status, data };
    }

    try {
        // 1. Test Demo Login via /auth/demo-login
        const demoLoginRes = await request('/auth/demo-login', { method: 'POST' });
        assert(demoLoginRes.status === 200, 'POST /auth/demo-login returns 200');
        assert(demoLoginRes.data?.data?.user?.is_demo === true, 'demo-login user object has is_demo: true');
        const demoToken = demoLoginRes.data?.data?.token;
        assert(Boolean(demoToken), 'demo-login returns valid token');

        // 2. Test Demo Login via standard /auth/login with password
        const standardDemoLogin = await request('/auth/login', {
            method: 'POST',
            body: { email: 'demo@farmora.com', password: 'demofarmora' }
        });
        assert(standardDemoLogin.status === 200, 'POST /auth/login with demo credentials returns 200');
        assert(standardDemoLogin.data?.data?.user?.is_demo === true, 'standard login user object has is_demo: true');

        // 3. Test Owner Login
        // We know user 2 is taufik@farmora.com. Let's create an owner token directly or login
        const jwt = require('jsonwebtoken');
        const ownerToken = jwt.sign({ userId: 2, isDemo: false }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // 4. Test GET /auth/me for demo account
        const demoMeRes = await request('/auth/me', {
            headers: { Authorization: `Bearer ${demoToken}` }
        });
        assert(demoMeRes.status === 200, 'GET /auth/me for demo returns 200');
        assert(demoMeRes.data?.data?.is_demo === true, 'GET /auth/me for demo reports is_demo: true');

        // 5. Test GET /auth/me for owner account
        const ownerMeRes = await request('/auth/me', {
            headers: { Authorization: `Bearer ${ownerToken}` }
        });
        assert(ownerMeRes.status === 200, 'GET /auth/me for owner returns 200');
        assert(ownerMeRes.data?.data?.is_demo === false, 'GET /auth/me for owner reports is_demo: false');

        // 6. Test Data Isolation
        const demoFarmsRes = await request('/farms', {
            headers: { Authorization: `Bearer ${demoToken}` }
        });
        assert(demoFarmsRes.status === 200, 'GET /farms for demo returns 200');
        assert(Array.isArray(demoFarmsRes.data?.data), 'GET /farms returns array');
        assert(demoFarmsRes.data?.data?.length === 2, `Demo user sees exactly 2 demo farms (got ${demoFarmsRes.data?.data?.length})`);
        const demoFarmIds = demoFarmsRes.data?.data?.map(f => f.id) || [];

        const ownerFarmsRes = await request('/farms', {
            headers: { Authorization: `Bearer ${ownerToken}` }
        });
        assert(ownerFarmsRes.status === 200, 'GET /farms for owner returns 200');
        assert(ownerFarmsRes.data?.data?.length === 4, `Owner sees exactly 4 owner farms (got ${ownerFarmsRes.data?.data?.length})`);
        const ownerFarmIds = ownerFarmsRes.data?.data?.map(f => f.id) || [];

        // Check ID intersection (must be 0)
        const overlap = demoFarmIds.filter(id => ownerFarmIds.includes(id));
        assert(overlap.length === 0, 'No overlap between demo farms and owner farms (Data Isolation Verified)');

        // 7. Test Demo Read Access to all resources
        const demoFieldsRes = await request('/fields', { headers: { Authorization: `Bearer ${demoToken}` } });
        assert(demoFieldsRes.status === 200, 'GET /fields for demo returns 200');

        const demoCropsRes = await request('/crop-cycles', { headers: { Authorization: `Bearer ${demoToken}` } });
        assert(demoCropsRes.status === 200, 'GET /crop-cycles for demo returns 200');

        const demoActRes = await request('/activities', { headers: { Authorization: `Bearer ${demoToken}` } });
        assert(demoActRes.status === 200, 'GET /activities for demo returns 200');

        const demoHarvRes = await request('/harvests', { headers: { Authorization: `Bearer ${demoToken}` } });
        assert(demoHarvRes.status === 200, 'GET /harvests for demo returns 200');

        const demoExpRes = await request('/expenses', { headers: { Authorization: `Bearer ${demoToken}` } });
        assert(demoExpRes.status === 200, 'GET /expenses for demo returns 200');

        const demoDashRes = await request('/dashboard', { headers: { Authorization: `Bearer ${demoToken}` } });
        assert(demoDashRes.status === 200, 'GET /dashboard for demo returns 200');

        // 8. Test Demo Mutation Operations (MUST ALL RETURN HTTP 403)
        const farmId = demoFarmIds[0];

        const testMutations = [
            { method: 'POST', endpoint: '/farms', body: { name: 'Hack Farm' }, name: 'POST /farms' },
            { method: 'PUT', endpoint: `/farms/${farmId}`, body: { name: 'Hacked' }, name: `PUT /farms/${farmId}` },
            { method: 'DELETE', endpoint: `/farms/${farmId}`, name: `DELETE /farms/${farmId}` },

            { method: 'POST', endpoint: '/fields', body: { farm_id: farmId, name: 'Hack Field' }, name: 'POST /fields' },
            { method: 'PUT', endpoint: '/fields/1', body: { name: 'Hacked' }, name: 'PUT /fields/1' },
            { method: 'DELETE', endpoint: '/fields/1', name: 'DELETE /fields/1' },

            { method: 'POST', endpoint: '/crop-cycles', body: { field_id: 1, crop_name: 'Hack' }, name: 'POST /crop-cycles' },
            { method: 'PUT', endpoint: '/crop-cycles/1', body: { crop_name: 'Hacked' }, name: 'PUT /crop-cycles/1' },
            { method: 'DELETE', endpoint: '/crop-cycles/1', name: 'DELETE /crop-cycles/1' },

            { method: 'POST', endpoint: '/activities', body: { crop_cycle_id: 1 }, name: 'POST /activities' },
            { method: 'PUT', endpoint: '/activities/1', body: {}, name: 'PUT /activities/1' },
            { method: 'DELETE', endpoint: '/activities/1', name: 'DELETE /activities/1' },

            { method: 'POST', endpoint: '/harvests', body: { crop_cycle_id: 1 }, name: 'POST /harvests' },
            { method: 'PUT', endpoint: '/harvests/1', body: {}, name: 'PUT /harvests/1' },
            { method: 'DELETE', endpoint: '/harvests/1', name: 'DELETE /harvests/1' },

            { method: 'POST', endpoint: '/expenses', body: { farm_id: farmId }, name: 'POST /expenses' },
            { method: 'PUT', endpoint: '/expenses/1', body: {}, name: 'PUT /expenses/1' },
            { method: 'DELETE', endpoint: '/expenses/1', name: 'DELETE /expenses/1' },

            // 9. AI Endpoints Must Return HTTP 403
            { method: 'POST', endpoint: '/ai-detection/quick-scan', body: {}, name: 'POST /ai-detection/quick-scan (Quick Plant Scan)' },
            { method: 'DELETE', endpoint: '/ai-detection/quick-scans', name: 'DELETE /ai-detection/quick-scans' },
            { method: 'POST', endpoint: '/ai-detection/images', body: {}, name: 'POST /ai-detection/images (Upload Plant Image)' },
            { method: 'POST', endpoint: '/ai-detection/images/1/analyze', body: {}, name: 'POST /ai-detection/images/:id/analyze (AI Diagnosis)' }
        ];

        for (const mut of testMutations) {
            const res = await request(mut.endpoint, {
                method: mut.method,
                headers: { Authorization: `Bearer ${demoToken}` },
                body: mut.body
            });
            assert(res.status === 403, `Demo account ${mut.name} blocked with HTTP 403 (Message: "${res.data?.message}")`);
        }

        // 10. Test Owner can still perform CRUD
        const createFarmRes = await request('/farms', {
            method: 'POST',
            headers: { Authorization: `Bearer ${ownerToken}` },
            body: {
                name: 'Kebun Test Owner Sementara',
                location: 'Semarang',
                description: 'Test CRUD Owner'
            }
        });
        assert(createFarmRes.status === 201, 'Owner account CAN create farm (HTTP 201)');
        const createdFarmId = createFarmRes.data?.data?.id;

        if (createdFarmId) {
            const updateFarmRes = await request(`/farms/${createdFarmId}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${ownerToken}` },
                body: {
                    name: 'Kebun Test Owner Update',
                    location: 'Semarang'
                }
            });
            assert(updateFarmRes.status === 200, 'Owner account CAN update farm (HTTP 200)');

            const deleteFarmRes = await request(`/farms/${createdFarmId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${ownerToken}` }
            });
            assert(deleteFarmRes.status === 200, 'Owner account CAN delete farm (HTTP 200)');
        }

    } catch (err) {
        console.error('Test execution error:', err);
        failedTests++;
    } finally {
        server.close();
        pool.end();
        console.log(`\n--- TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED ---`);
        process.exit(failedTests > 0 ? 1 : 0);
    }
}

runTests();
