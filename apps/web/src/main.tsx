import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { FeedbackProvider } from '@novel/components';
import { router } from './router';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FeedbackProvider>
      <RouterProvider router={router} />
    </FeedbackProvider>
  </StrictMode>,
);
