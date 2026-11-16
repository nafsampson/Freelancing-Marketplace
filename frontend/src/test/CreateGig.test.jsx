import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CreateGig from '../pages/CreateGig';
import * as gigService from '../services/gigService';

describe('CreateGig Component', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('renders all form fields and category options', () => {
        render(
            <BrowserRouter>
                <CreateGig />
            </BrowserRouter>
        );

        expect(screen.getByLabelText(/Gig title \*/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Description \*/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Category \*/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Price \(ZAR\) \*/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Skills and expertise/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Publish gig/i })).toBeInTheDocument();
    });

    it('validates minimum title length requirement on submit', async () => {
        render(
            <BrowserRouter>
                <CreateGig />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText(/Gig title \*/i), { target: { value: 'Hi' } });
        fireEvent.change(screen.getByLabelText(/Description \*/i), {
            target: { value: 'This is a description with more than 20 characters.' }
        });
        fireEvent.change(screen.getByLabelText(/Category \*/i), { target: { value: 'Web Development' } });
        fireEvent.change(screen.getByLabelText(/Price \(ZAR\) \*/i), { target: { value: '450' } });

        const form = screen.getByRole('button', { name: /Publish gig/i }).closest('form');
        fireEvent.submit(form);

        expect(await screen.findByText(/The gig title must contain at least 5 characters/i)).toBeInTheDocument();
    });

    it('validates minimum description length requirement', async () => {
        render(
            <BrowserRouter>
                <CreateGig />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText(/Gig title \*/i), { target: { value: 'Full Stack Service' } });
        fireEvent.change(screen.getByLabelText(/Description \*/i), { target: { value: 'Short text' } });
        fireEvent.change(screen.getByLabelText(/Category \*/i), { target: { value: 'Web Development' } });
        fireEvent.change(screen.getByLabelText(/Price \(ZAR\) \*/i), { target: { value: '500' } });

        const form = screen.getByRole('button', { name: /Publish gig/i }).closest('form');
        fireEvent.submit(form);

        expect(await screen.findByText(/The description must contain at least 20 characters/i)).toBeInTheDocument();
    });

    it('submits valid gig data successfully', async () => {
        vi.spyOn(gigService, 'createGig').mockResolvedValueOnce({ success: true });

        render(
            <BrowserRouter>
                <CreateGig />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText(/Gig title \*/i), {
            target: { value: 'Enterprise Cloud Migration' }
        });
        fireEvent.change(screen.getByLabelText(/Description \*/i), {
            target: { value: 'End-to-end Kubernetes and Terraform infrastructure migration.' }
        });
        fireEvent.change(screen.getByLabelText(/Category \*/i), {
            target: { value: 'Web Development' }
        });
        fireEvent.change(screen.getByLabelText(/Price \(ZAR\) \*/i), {
            target: { value: '3500' }
        });
        fireEvent.change(screen.getByLabelText(/Skills and expertise/i), {
            target: { value: 'AWS, Terraform, Kubernetes' }
        });

        const form = screen.getByRole('button', { name: /Publish gig/i }).closest('form');
        fireEvent.submit(form);

        await waitFor(() => {
            expect(gigService.createGig).toHaveBeenCalledWith({
                title: 'Enterprise Cloud Migration',
                description: 'End-to-end Kubernetes and Terraform infrastructure migration.',
                category: 'Web Development',
                price: 3500,
                skills: ['AWS', 'Terraform', 'Kubernetes'],
            });
            expect(screen.getByText(/Your gig has been submitted successfully/i)).toBeInTheDocument();
        });
    });
});
