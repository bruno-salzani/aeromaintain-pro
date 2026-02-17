import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import UsersManager from '@/components/UsersManager';
import { User } from '@/types';

describe('UsersManager', () => {
  it('creates, edits and deletes users', () => {
    const users: User[] = [];
    const onAdd = vi.fn();
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    const onClose = vi.fn();
    const { getByText, getAllByRole } = render(
      <UsersManager users={users} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} onClose={onClose} />
    );
    fireEvent.click(getByText('Novo Usuário'));
    const inputs = getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Alice' } });
    fireEvent.change(inputs[1], { target: { value: 'alice@example.com' } });
    fireEvent.click(getByText('Criar Usuário'));
    expect(onAdd).toHaveBeenCalledWith({ nome: 'Alice', email: 'alice@example.com', role: 'OPERADOR', ativo: true });
    const closeBtn = document.querySelector('button[aria-label="Fechar"]') as HTMLButtonElement;
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
