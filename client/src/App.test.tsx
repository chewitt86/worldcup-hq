import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App (Phase 0 smoke)', () => {
  it('renders the title inside a sticker card', () => {
    render(<App />)
    expect(screen.getByText("Leo's World Cup")).toBeInTheDocument()
  })
})
