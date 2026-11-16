import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import EditGig from '../pages/EditGig';
import * as gigService from '../services/gigService';

describe('EditGig Component', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('loads existing gig data and populates form inputs', async () => {
        vi.spyOn(gigService, 'getGigById').mockResolvedValueOnce({
            data: {
                id: 'gig-42',
                title: 'Existing Web Gig',
                description: 'Existing comprehensive web development services for business.',
                category: 'Web Development',
                price: 850,
                skills: ['React', 'TypeScript']
            }
        });

        render(
            <MemoryRouter initialEntries={['/freelancer/gigs/gig-42/edit']}>
                <Routes>
                    <Route path="/freelancer/gigs/:id/edit" element={<EditGig />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Loading gig details.../i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByLabelText(/Gig title \*/i).value).toBe('Existing Web Gig');
            expect(screen.getByLabelText(/Description \*/i).value).toBe(
                'Existing comprehensive web development services for business.'
            );
            expect(screen.getByLabelText(/Category \*/i).value).toBe('Web Development');
            expect(screen.getByLabelText(/Price \(ZAR\) \*/i).value).toBe('850');
            expect(screen.getByLabelText(/Skills and expertise/i).value).toBe('React, TypeScript');
        });
    });

    it('submits updated gig changes successfully', async () => {
        vi.spyOn(gigService, 'getGigById').mockResolvedValueOnce({
            data: {
                id: 'gig-42',
                title: 'Initial Gig Title',
                description: 'Initial detailed description with more than 20 characters.',
                category: 'Web Development',
                price: 1000,
                skills: ['Node.js']
            }
        });
        vi.spyOn(gigService, 'updateGig').mockResolvedValueOnce({ success: true });

        render(
            <MemoryRouter initialEntries={['/freelancer/gigs/gig-42/edit']}>
                <Routes>
                    <Route path="/freelancer/gigs/:id/edit" element={<EditGig />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Gig title \*/i).value).toBe('Initial Gig Title');
        });

        fireEvent.change(screen.getByLabelText(/Gig title \*/i), {
            target: { value: 'Updated Advanced Gig Title' }
        });
        fireEvent.change(screen.getByLabelText(/Price \(ZAR\) \*/i), {
            target: { value: '1250' }
        });

        const form = screen.getByRole('button', { name: /Save changes/i }).closest('form');
        fireEvent.submit(form);

        await waitFor(() => {
            expect(gigService.updateGig).toHaveBeenCalledWith('gig-42', {
                title: 'Updated Advanced Gig Title',
                description: 'Initial detailed description with more than 20 characters.',
                category: 'Web Development',
                price: 1250,
                skills: ['Node.js'],
            });
            expect(screen.getByText(/Your gig has been updated successfully/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Back to dashboard/i })).toBeInTheDocument();
        });
    });
});
