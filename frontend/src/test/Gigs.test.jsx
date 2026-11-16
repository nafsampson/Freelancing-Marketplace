import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Gigs from '../pages/Gigs';
import * as gigService from '../services/gigService';

describe('Gigs (Browse) Component', () => {
    it('shows loading indicator and renders fetched gigs', async () => {
        vi.spyOn(gigService, 'getGigs').mockResolvedValueOnce({
            data: [
                {
                    id: '123456789012345678901234',
                    title: 'Full Stack Website',
                    description: 'Modern web development with Node and React.',
                    category: 'Web Development',
                    price: 300,
                    skills: ['React', 'Node'],
                    freelancer: { name: 'Dev Master' }
                }
            ]
        });

        render(
            <BrowserRouter>
                <Gigs />
            </BrowserRouter>
        );

        expect(screen.getByText(/Finding available gigs/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Full Stack Website')).toBeInTheDocument();
            expect(screen.getByText(/Modern web development/i)).toBeInTheDocument();
        });
    });

    it('filters gigs according to search query input', async () => {
        vi.spyOn(gigService, 'getGigs').mockResolvedValueOnce({
            data: [
                {
                    id: '1',
                    title: 'Logo Design',
                    description: 'Creative brand design for startups.',
                    category: 'Graphic Design',
                    price: 150,
                    skills: ['Photoshop'],
                    freelancer: { name: 'Designer' }
                },
                {
                    id: '2',
                    title: 'Python Scripting',
                    description: 'Automate data workflows with Python.',
                    category: 'Data & Analytics',
                    price: 200,
                    skills: ['Python'],
                    freelancer: { name: 'Coder' }
                }
            ]
        });

        render(
            <BrowserRouter>
                <Gigs />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Logo Design')).toBeInTheDocument();
            expect(screen.getByText('Python Scripting')).toBeInTheDocument();
        });

        const searchInput = screen.getByLabelText(/Search gigs/i);
        fireEvent.change(searchInput, { target: { value: 'Python' } });

        expect(screen.queryByText('Logo Design')).not.toBeInTheDocument();
        expect(screen.getByText('Python Scripting')).toBeInTheDocument();
    });
});
