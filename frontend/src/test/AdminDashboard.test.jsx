import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from '../pages/AdminDashboard';
import * as adminService from '../services/adminService';
import * as AuthContextModule from '../context/AuthContext';

describe('AdminDashboard Component', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('renders platform overview metrics and moderation lists', async () => {
        vi.spyOn(adminService, 'getAdminStats').mockResolvedValueOnce({
            data: {
                totalUsers: 142,
                clientUsers: 90,
                freelancerUsers: 52,
                totalGigs: 48,
                totalBookings: 63
            }
        });
        vi.spyOn(adminService, 'getAdminUsers').mockResolvedValueOnce({
            data: [
                { id: 'u1', name: 'Super Admin', email: 'admin@hustlehub.test', role: 'Admin' },
                { id: 'u2', name: 'Alice Client', email: 'alice@test.com', role: 'Client' },
            ]
        });
        vi.spyOn(adminService, 'getAdminGigs').mockResolvedValueOnce({
            data: [
                { id: 'g1', title: 'Full Stack App', category: 'Web Development', price: 1200 }
            ]
        });
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
            user: { id: 'admin-1', role: 'Admin', name: 'Platform Admin' }
        });

        render(
            <BrowserRouter>
                <AdminDashboard />
            </BrowserRouter>
        );

        expect(screen.getByText(/ADMINISTRATION/i)).toBeInTheDocument();
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('142')).toBeInTheDocument(); // totalUsers
            expect(screen.getByText('Super Admin')).toBeInTheDocument();
            expect(screen.getByText('Full Stack App')).toBeInTheDocument();
        });
    });

    it('handles statistics loading failure gracefully', async () => {
        vi.spyOn(adminService, 'getAdminStats').mockRejectedValueOnce(
            new Error('Database query timed out')
        );
        vi.spyOn(adminService, 'getAdminUsers').mockResolvedValueOnce({ data: [] });
        vi.spyOn(adminService, 'getAdminGigs').mockResolvedValueOnce({ data: [] });
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
            user: { id: 'admin-1', role: 'Admin', name: 'Platform Admin' }
        });

        render(
            <BrowserRouter>
                <AdminDashboard />
            </BrowserRouter>
        );

        expect(await screen.findByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Could not load statistics/i)).toBeInTheDocument();
    });
});
