import React from 'react';
import AuthForms from '@/components/AuthForms';
import { useAppDomain } from '@/state/AppDomain';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/state/store';

export default function LoginPage() {
  const { login } = useAppDomain();
  const navigate = useNavigate();
  return <AuthForms onAuthenticated={() => { useAppStore.getState().login('demo-token', 'ADMIN'); login(); navigate('/'); }} />;
}
