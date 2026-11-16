import { describe, it, vi, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { getProfile, logoutUser } from '../services/authService';
vi.mock('../services/authService', () => ({ getProfile: vi.fn(), logoutUser: vi.fn(), loginUser: vi.fn(), registerUser: vi.fn() }));
function Probe() {
    const { user, logout } = useAuth();
    return <><p>{user ? 'Signed in' : 'Signed out'}</p><button onClick={() => logout().catch(() => {})}>Sign out</button></>;
}
describe('Local session cleanup', () => {
    beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); });
    it('does not trust a saved user without an authentication token', async () => {
        localStorage.setItem('user', JSON.stringify({ role: 'Admin' }));
        render(<AuthProvider><Probe /></AuthProvider>);
        expect(screen.getByText('Signed out')).toBeInTheDocument();
        expect(getProfile).not.toHaveBeenCalled();
        expect(localStorage.getItem('user')).toBeNull();
    });
    it('clears the local session even when server sign-out fails', async () => {
        localStorage.setItem('token', 'test-token');
        localStorage.setItem('user', JSON.stringify({ role: 'Client', id: 'c1' }));
        getProfile.mockResolvedValue({ data: { role: 'Client', id: 'c1' } });
        logoutUser.mockRejectedValue(Error('Network unavailable'));
        render(<AuthProvider><Probe /></AuthProvider>);
        await waitFor(() => expect(getProfile).toHaveBeenCalled());
        fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
        await waitFor(() => expect(screen.getByText('Signed out')).toBeInTheDocument());
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
    });
});
