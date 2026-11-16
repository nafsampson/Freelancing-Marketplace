import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../pages/Home';
import { AuthProvider } from '../context/AuthContext';

describe('Home Component', () => {
    it('renders hero title and value proposition', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <Home />
                </AuthProvider>
            </BrowserRouter>
        );

        expect(screen.getByText(/Great work starts/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Explore gigs/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Join HustleHub\+/i })).toBeInTheDocument();
    });

    it('renders platform features and highlights', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <Home />
                </AuthProvider>
            </BrowserRouter>
        );

        expect(screen.getByText(/Find the right talent/i)).toBeInTheDocument();
        expect(screen.getByText(/Showcase your skills/i)).toBeInTheDocument();
        expect(screen.getByText(/Keep everything organised/i)).toBeInTheDocument();
    });
});
