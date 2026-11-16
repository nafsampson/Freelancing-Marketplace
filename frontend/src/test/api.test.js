import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest } from '../services/api';

describe('API Client Service (apiRequest)', () => {
    it('reports network failures in readable language', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));
        await expect(apiRequest('/gigs')).rejects.toThrow('Unable to connect. Check your connection and try again.');
    });
    beforeEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it('adds Content-Type header when request includes body', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
        });

        await apiRequest('/test', {
            method: 'POST',
            body: JSON.stringify({ message: 'hello' }),
        });

        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining('/test'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                }),
            })
        );
    });

    it('attaches Bearer token Authorization header when token exists in storage', async () => {
        localStorage.setItem('token', 'jwt-test-token-12345');

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
        });

        await apiRequest('/api/protected');

        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining('/api/protected'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer jwt-test-token-12345',
                }),
            })
        );
    });

    it('throws formatted error when HTTP response status is not ok', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 403,
            json: async () => ({ message: 'Access denied: insufficient privileges' }),
        });

        await expect(apiRequest('/api/admin')).rejects.toThrow(
            'Access denied: insufficient privileges'
        );
    });
});
