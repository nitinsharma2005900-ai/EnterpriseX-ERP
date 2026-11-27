import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { canAccess } from '../src/lib/permissions';
import { MasterData } from '../src/components/MasterData';

vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'SALES_USER' } }) }));
vi.mock('../src/lib/api', () => ({ fetchApi: vi.fn().mockResolvedValue({ data: [{ id: 'c1', code: 'C1', name: 'Existing Customer', email: 'buyer@example.test', status: 'ACTIVE' }] }) }));

describe('Module permissions and master data forms', () => {
  it('hides finance and administration from warehouse users', () => {
    expect(canAccess('WAREHOUSE_OPERATOR','/finance')).toBe(false);
    expect(canAccess('WAREHOUSE_OPERATOR','/admin')).toBe(false);
    expect(canAccess('WAREHOUSE_OPERATOR','/inventory')).toBe(true);
  });
  it('allows administrator modules and finance workflows', () => {
    expect(canAccess('ERP_ADMINISTRATOR','/admin')).toBe(true);
    expect(canAccess('FINANCE_OFFICER','/workflows')).toBe(true);
    expect(canAccess('PROCUREMENT_OFFICER','/workflows')).toBe(false);
  });
  it('loads customer records, filters and opens a validated create form', async () => {
    render(<MasterData kind="customers"/>);
    expect(await screen.findByText('Existing Customer')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search customers'),{target:{value:'unmatched'}});
    expect(screen.queryByText('Existing Customer')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Add customer'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('textbox',{name:/^email$/i})).toHaveAttribute('type','email');
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('does not offer unauthorized vendor mutations', async () => {
    render(<MasterData kind="vendors"/>);
    await screen.findByText('Existing Customer');
    expect(screen.queryByText('Add vendor')).not.toBeInTheDocument();
  });
});
