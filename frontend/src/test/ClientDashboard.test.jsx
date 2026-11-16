import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ClientDashboard from '../pages/ClientDashboard';
import * as bookingService from '../services/bookingService';
import * as AuthContextModule from '../context/AuthContext';

describe('ClientDashboard Component', () => {
    it('keeps historical bookings readable when their service has been removed', async () => {
        vi.spyOn(bookingService, 'getBookings').mockResolvedValueOnce({ data: [
            { id: 'deleted-service-booking', gigId: null, status: 'Completed', amount: 500 }
        ] });
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ user: { id: 'c1', role: 'Client' } });
        render(<BrowserRouter><ClientDashboard /></BrowserRouter>);
        expect(await screen.findByText('Freelance service')).toBeInTheDocument();
        expect(screen.getByText('Service unavailable')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'View gig' })).not.toBeInTheDocument();
    });
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('displays empty state when client has no bookings', async () => {
        vi.spyOn(bookingService, 'getBookings').mockResolvedValueOnce({ data: [] });
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
            user: { id: 'c1', name: 'Acme Corp', role: 'Client' }
        });

        render(
            <BrowserRouter>
                <ClientDashboard />
            </BrowserRouter>
        );

        expect(screen.getByText(/CLIENT WORKSPACE/i)).toBeInTheDocument();
        expect(screen.getByText(/Loading your bookings.../i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText(/Your next project starts here/i)).toBeInTheDocument();
            expect(screen.getByRole('link', { name: /Browse gigs/i })).toBeInTheDocument();
        });
    });

    it('renders client bookings list and summary metric cards', async () => {
        vi.spyOn(bookingService, 'getBookings').mockResolvedValueOnce({
            data: [
                {
                    id: 'b-1',
                    status: 'Pending',
                    gigTitle: 'Brand Identity Design',
                    amount: 1200,
                    createdAt: '2026-11-01T10:00:00.000Z',
                },
                {
                    id: 'b-2',
                    status: 'Completed',
                    gigTitle: 'React Native Mobile App',
                    amount: 5000,
                    createdAt: '2026-11-05T12:00:00.000Z',
                }
            ]
        });
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
            user: { id: 'c1', name: 'Acme Corp', role: 'Client' }
        });

        render(
            <BrowserRouter>
                <ClientDashboard />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Brand Identity Design')).toBeInTheDocument();
            expect(screen.getByText('React Native Mobile App')).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument(); // Total bookings
        });
    });
});
