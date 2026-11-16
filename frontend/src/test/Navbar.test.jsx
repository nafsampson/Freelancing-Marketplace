import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { AuthProvider } from '../context/AuthContext';

describe('Navbar Component', () => {
    it('renders brand name and public navigation links', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <Navbar />
                </AuthProvider>
            </BrowserRouter>
        );

        expect(screen.getByText(/HustleHub/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Browse Gigs/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Log in/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Get started/i })).toBeInTheDocument();
    });
});

