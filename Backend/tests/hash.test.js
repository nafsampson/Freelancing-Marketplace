const { describe, it } = require('node:test');
const assert = require('node:assert');
const { hashedPassword, comparePasswords } = require('../utils/hash');

describe('Backend Utility: Hash & Password Security', () => {
    it('should hash a plain password using bcrypt', async () => {
        const plain = 'StrongPass123!';
        const hash = await hashedPassword(plain);

        assert.ok(hash, 'Hash should be generated');
        assert.notStrictEqual(hash, plain, 'Hash must not equal plain password');
        assert.ok(hash.startsWith('$2'), 'Hash should be a bcrypt string starting with $2');
    });

    it('should successfully verify matching password against hash', async () => {
        const plain = 'MySecretPass789@';
        const hash = await hashedPassword(plain);
        const isMatch = await comparePasswords(plain, hash);

        assert.strictEqual(isMatch, true, 'Correct password must match hash');
    });

    it('should reject non-matching password against hash', async () => {
        const plain = 'CorrectPassword123!';
        const wrong = 'WrongPassword456!';
        const hash = await hashedPassword(plain);
        const isMatch = await comparePasswords(wrong, hash);

        assert.strictEqual(isMatch, false, 'Wrong password must be rejected');
    });
});
