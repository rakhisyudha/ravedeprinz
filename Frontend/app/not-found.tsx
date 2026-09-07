import { ErrorState } from '../components/ErrorState';
import { errorStates } from '../components/errorStates';

export default function NotFound() {
  return (
    <main className="auth-denied-overlay">
      <ErrorState {...errorStates.notFound} href="/" />
    </main>
  );
}
