import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GigDetails from '../pages/GigDetails';
import * as gigService from '../services/gigService';
import * as bookingService from '../services/bookingService';
import * as AuthContextModule from '../context/AuthContext';

describe('GigDetails Component', () => {
    it('blocks repeat clicks while saving and after successful submission', async () => {
        vi.spyOn(gigService, 'getGigById').mockResolvedValue({ data: { id: '123', title: 'Test service', price: 500 } });
        let finish;
        vi.spyOn(bookingService, 'createBooking').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ user: { id: 'c1', role: 'Client' } });
        render(<MemoryRouter initialEntries={['/gigs/123']}><Routes><Route path="/gigs/:id" element={<GigDetails />} /></Routes></MemoryRouter>);
        const button = await screen.findByRole('button', { name: 'Book this service' });
        fireEvent.click(button);
        fireEvent.click(button);
        expect(bookingService.createBooking).toHaveBeenCalledTimes(1);
        finish({ success: true });
        expect(await screen.findByRole('button', { name: 'Booking requested' })).toBeDisabled();
        expect(screen.getByRole('link', { name: 'View your bookings' })).toBeInTheDocument();
    });

    it('allows a retry after a failed booking request', async () => {
        vi.spyOn(gigService, 'getGigById').mockResolvedValue({ data: { id: '123', title: 'Test service', price: 500 } });
        vi.spyOn(bookingService, 'createBooking').mockRejectedValueOnce(Error('Network unavailable'));
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ user: { id: 'c1', role: 'Client' } });
        render(<MemoryRouter initialEntries={['/gigs/123']}><Routes><Route path="/gigs/:id" element={<GigDetails />} /></Routes></MemoryRouter>);
        fireEvent.click(await screen.findByRole('button', { name: 'Book this service' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
        expect(screen.getByRole('button', { name: 'Book this service' })).toBeEnabled();
    });
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('renders loading state initially', () => {
        vi.spyOn(gigService, 'getGigById').mockImplementation(() => new Promise(() => {}));
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ user: null });

        render(
            <MemoryRouter initialEntries={['/gigs/123']}>
                <Routes>
                    <Route path="/gigs/:id" element={<GigDetails />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Loading gig details.../i)).toBeInTheDocument();
    });

    it('displays error message when gig cannot be loaded', async () => {
        vi.spyOn(gigService, 'getGigById').mockRejectedValueOnce(new Error('Gig not found'));
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ user: null });

        render(
            <MemoryRouter initialEntries={['/gigs/999']}>
                <Routes>
                    <Route path="/gigs/:id" element={<GigDetails />} />
                </Routes>
            </MemoryRouter>
        );

        expect(await screen.findByText('Unable to load this gig')).toBeInTheDocument();
        expect(screen.getByText('Gig not found')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Back to Browse Gigs/i })).toBeInTheDocument();
    });

    it('renders gig details, provider info, and login link for guest user', async () => {
        vi.spyOn(gigService, 'getGigById').mockResolvedValueOnce({
            data: {
                id: '123',
                title: 'Professional Cloud Architecture',
                description: 'Scalable AWS and Google Cloud DevOps design.',
                category: 'DevOps & Cloud',
                price: 1500,
                skills: ['AWS', 'Docker', 'Kubernetes'],
                freelancer: { name: 'Cloud Specialist' }
            }
        });
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({ user: null });

        render(
            <MemoryRouter initialEntries={['/gigs/123']}>
                <Routes>
                    <Route path="/gigs/:id" element={<GigDetails />} />
                </Routes>
            </MemoryRouter>
        );

        expect(await screen.findByText('Professional Cloud Architecture')).toBeInTheDocument();
        expect(screen.getByText('Cloud Specialist')).toBeInTheDocument();
        expect(screen.getByText('AWS')).toBeInTheDocument();
        expect(screen.getByText('Docker')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Log in to book/i })).toBeInTheDocument();
    });

    it('allows authenticated Client user to book service', async () => {
        vi.spyOn(gigService, 'getGigById').mockResolvedValueOnce({
            data: {
                id: '123',
                title: 'Mobile App Development',
                description: 'High performance React Native iOS and Android app.',
                category: 'Mobile Development',
                price: 2500,
                skills: ['React Native'],
                freelancer: { name: 'App Crafter' }
            }
        });
        vi.spyOn(bookingService, 'createBooking').mockResolvedValueOnce({ success: true });
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
            user: { id: 'client-1', role: 'Client', fullName: 'Corporate Buyer' }
        });

        render(
            <MemoryRouter initialEntries={['/gigs/123']}>
                <Routes>
                    <Route path="/gigs/:id" element={<GigDetails />} />
                </Routes>
            </MemoryRouter>
        );

        expect(await screen.findByText('Mobile App Development')).toBeInTheDocument();
        const bookBtn = screen.getByRole('button', { name: /Book this service/i });
        expect(bookBtn).toBeInTheDocument();

        fireEvent.click(bookBtn);

        await waitFor(() => {
            expect(bookingService.createBooking).toHaveBeenCalledWith('123');
            expect(screen.getByText(/Your booking request was submitted successfully/i)).toBeInTheDocument();
        });
    });

    it('shows informational notice when Freelancer views the gig', async () => {
        vi.spyOn(gigService, 'getGigById').mockResolvedValueOnce({
            data: {
                id: '123',
                title: 'SEO Audit',
                description: 'Complete technical SEO review.',
                category: 'Digital Marketing',
                price: 800,
                skills: ['SEO'],
                freelancer: { name: 'Marketing Pro' }
            }
        });
        vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
            user: { id: 'freelancer-2', role: 'Freelancer', fullName: 'Fellow Dev' }
        });

        render(
            <MemoryRouter initialEntries={['/gigs/123']}>
                <Routes>
                    <Route path="/gigs/:id" element={<GigDetails />} />
                </Routes>
            </MemoryRouter>
        );

        expect(await screen.findByText('SEO Audit')).toBeInTheDocument();
        expect(screen.getByText(/You are viewing this gig as a Freelancer/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Book this service/i })).not.toBeInTheDocument();
    });
});
